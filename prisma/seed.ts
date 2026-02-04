import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create a sample organization
  const org = await prisma.organization.upsert({
    where: { id: 'default-org' },
    update: {},
    create: {
      id: 'default-org',
      name: 'Sample Corporation',
      slug: 'sample-corporation',
      dpoName: 'Juan Dela Cruz',
      dpoEmail: 'dpo@samplecorp.com',
      industry: 'Technology',
      employeeCount: 150,
      address: '123 Tech Street',
      city: 'Manila',
      country: 'Philippines',
      phone: '+63 2 1234 5678',
      email: 'contact@samplecorp.com',
      website: 'https://www.samplecorp.com',
      description: 'A leading technology company focused on digital transformation and innovation',
    },
  })

  console.log('✅ Created organization:', org.name)

  // Create departments
  const hrDept = await prisma.department.upsert({
    where: { id: 'dept-hr' },
    update: {},
    create: {
      id: 'dept-hr',
      name: 'Human Resources',
      description: 'Responsible for recruitment, payroll, benefits, and employee relations',
      orgId: org.id,
    },
  })

  const marketingDept = await prisma.department.upsert({
    where: { id: 'dept-marketing' },
    update: {},
    create: {
      id: 'dept-marketing',
      name: 'Marketing',
      description: 'Handles marketing campaigns, customer engagement, and brand management',
      orgId: org.id,
    },
  })

  const itDept = await prisma.department.upsert({
    where: { id: 'dept-it' },
    update: {},
    create: {
      id: 'dept-it',
      name: 'IT Department',
      description: 'Manages IT infrastructure, security, and technical systems',
      orgId: org.id,
    },
  })

  console.log('✅ Created departments:', [hrDept.name, marketingDept.name, itDept.name])

  // Create sample processes
  const process1 = await prisma.process.upsert({
    where: { id: 'process-1' },
    update: {},
    create: {
      id: 'process-1',
      deptId: hrDept.id,
      title: 'Employee Payroll Processing',
      description: 'Monthly processing of employee salaries and benefits',
      dataSubjects: ['Employees', 'Dependents'],
      dataCategories: ['Financial Information', 'Personal Information', 'Employment Details'],
      lawfulBasis: 'Legal Obligation',
      recipients: ['BIR', 'SSS', 'PhilHealth', 'Pag-IBIG', 'Bank'],
      retentionPeriod: '5 years after separation',
      status: 'APPROVED',
      riskLevel: 'MEDIUM',
    },
  })

  const process2 = await prisma.process.upsert({
    where: { id: 'process-2' },
    update: {},
    create: {
      id: 'process-2',
      deptId: marketingDept.id,
      title: 'Customer Email Marketing',
      description: 'Sending promotional emails to customers and leads',
      dataSubjects: ['Customers', 'Leads', 'Prospects'],
      dataCategories: ['Contact Information', 'Purchase History', 'Browsing Behavior'],
      lawfulBasis: 'Consent',
      recipients: ['Email Service Provider', 'Analytics Platform'],
      retentionPeriod: '2 years or until consent withdrawal',
      status: 'REVIEW',
      riskLevel: 'LOW',
    },
  })

  const process3 = await prisma.process.upsert({
    where: { id: 'process-3' },
    update: {},
    create: {
      id: 'process-3',
      deptId: itDept.id,
      title: 'CCTV Surveillance',
      description: 'Security monitoring of office premises',
      dataSubjects: ['Employees', 'Visitors', 'Contractors'],
      dataCategories: ['Biometric Data', 'Location Data', 'Video Footage'],
      lawfulBasis: 'Legitimate Interest',
      recipients: ['Security Agency', 'Law Enforcement (if required)'],
      retentionPeriod: '30 days',
      status: 'DRAFT',
      riskLevel: 'HIGH',
    },
  })

  console.log('✅ Created sample processes:', [process1.title, process2.title, process3.title])

  console.log('🎉 Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
