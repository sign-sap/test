import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import prisma from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { logDomainEvent } from '@/lib/audit'
import { errorResponse, successResponse, ErrorCodes } from '@/lib/errors'

interface ImportResult {
  createdCount: number
  updatedCount: number
  skippedCount: number
  errors: { row: number; message: string }[]
}

function normalizeHeader(header: string): string {
  const normalized = header.toLowerCase().trim()
  
  const mapping: Record<string, string> = {
    'name': 'name',
    'الاسم': 'name',
    'email': 'email',
    'e-mail': 'email',
    'البريد': 'email',
    'البريد الإلكتروني': 'email',
    'department': 'department',
    'القسم': 'department',
  }
  
  return mapping[normalized] || header
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin()

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        errorResponse(ErrorCodes.INVALID_INPUT, 'No file provided'),
        { status: 400 }
      )
    }

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ]

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      return NextResponse.json(
        errorResponse(ErrorCodes.INVALID_INPUT, 'Invalid file type. Only .xlsx and .xls files are allowed.'),
        { status: 400 }
      )
    }

    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        errorResponse(ErrorCodes.INVALID_INPUT, 'File too large. Maximum size is 10MB.'),
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const workbook = XLSX.read(buffer, { type: 'buffer' })

    const firstSheetName = workbook.SheetNames[0]
    if (!firstSheetName) {
      return NextResponse.json(
        errorResponse(ErrorCodes.INVALID_INPUT, 'Workbook has no sheets'),
        { status: 400 }
      )
    }

    const worksheet = workbook.Sheets[firstSheetName]
    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

    if (rawData.length < 2) {
      return NextResponse.json(
        errorResponse(ErrorCodes.INVALID_INPUT, 'File must contain header row and at least one data row'),
        { status: 400 }
      )
    }

    const headers = rawData[0].map((h: any) => normalizeHeader(String(h)))
    const dataRows = rawData.slice(1)

    const result: ImportResult = {
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errors: [],
    }

    const nameIndex = headers.indexOf('name')
    const emailIndex = headers.indexOf('email')
    const departmentIndex = headers.indexOf('department')

    if (emailIndex === -1) {
      return NextResponse.json(
        errorResponse(ErrorCodes.INVALID_INPUT, 'Email column is required'),
        { status: 400 }
      )
    }

    const seenEmails = new Set<string>()
    const submitterRole = await prisma.role.findUnique({ where: { name: 'submitter' } })

    if (!submitterRole) {
      return NextResponse.json(
        errorResponse(ErrorCodes.INTERNAL_ERROR, 'Submitter role not found in database'),
        { status: 500 }
      )
    }

    for (let i = 0; i < dataRows.length; i++) {
      const rowNumber = i + 2
      const row = dataRows[i]

      const email = row[emailIndex]?.toString().trim()
      const name = nameIndex !== -1 ? row[nameIndex]?.toString().trim() : undefined
      const department = departmentIndex !== -1 ? row[departmentIndex]?.toString().trim() : undefined

      if (!email) {
        result.skippedCount++
        result.errors.push({
          row: rowNumber,
          message: 'Missing email',
        })
        continue
      }

      if (!isValidEmail(email)) {
        result.skippedCount++
        result.errors.push({
          row: rowNumber,
          message: `Invalid email: ${email}`,
        })
        continue
      }

      if (seenEmails.has(email)) {
        result.skippedCount++
        result.errors.push({
          row: rowNumber,
          message: `Duplicate email in file: ${email}`,
        })
        continue
      }

      seenEmails.add(email)

      try {
        const existingUser = await prisma.user.findUnique({
          where: { email },
          include: { userRoles: true },
        })

        if (existingUser) {
          await prisma.user.update({
            where: { email },
            data: {
              name: name || existingUser.name,
              department: department || existingUser.department,
              profileCompleted: true,
            },
          })
          result.updatedCount++

          if (existingUser.userRoles.length === 0) {
            await prisma.userRole.create({
              data: {
                userId: existingUser.id,
                roleId: submitterRole.id,
              },
            })
          }
        } else {
          const newUser = await prisma.user.create({
            data: {
              email,
              name,
              department,
              profileCompleted: true,
            },
          })

          await prisma.userRole.create({
            data: {
              userId: newUser.id,
              roleId: submitterRole.id,
            },
          })

          result.createdCount++
        }
      } catch (error) {
        result.skippedCount++
        result.errors.push({
          row: rowNumber,
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    await logDomainEvent({
      action: 'users.import',
      entityType: 'User',
      entityId: 'bulk',
      userId: user.id,
      success: true,
      metadata: result,
      ip,
      userAgent,
    })

    return NextResponse.json(successResponse(result))
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return NextResponse.json(
          errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required'),
          { status: 401 }
        )
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json(
          errorResponse(ErrorCodes.PERMISSION_DENIED, 'Admin access required'),
          { status: 403 }
        )
      }
    }

    console.error('Import users error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal server error'),
      { status: 500 }
    )
  }
}
