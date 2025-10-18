-- Performance Optimization: Add indexes for frequently queried columns

-- User indexes (for member queries, role filtering)
CREATE INDEX IF NOT EXISTS "User_branchId_role_isActive_idx" ON "User"("branchId", "role", "isActive");
CREATE INDEX IF NOT EXISTS "User_role_createdAt_idx" ON "User"("role", "createdAt");
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");

-- Appointment indexes (for analytics, filtering)
CREATE INDEX IF NOT EXISTS "Appointment_branchId_createdAt_status_idx" ON "Appointment"("branchId", "createdAt", "status");
CREATE INDEX IF NOT EXISTS "Appointment_status_startAt_idx" ON "Appointment"("status", "startAt");
CREATE INDEX IF NOT EXISTS "Appointment_artistId_status_idx" ON "Appointment"("artistId", "status");
CREATE INDEX IF NOT EXISTS "Appointment_serviceId_createdAt_idx" ON "Appointment"("serviceId", "createdAt");

-- Order indexes (for revenue analytics, filtering)
CREATE INDEX IF NOT EXISTS "Order_branchId_createdAt_status_idx" ON "Order"("branchId", "createdAt", "status");
CREATE INDEX IF NOT EXISTS "Order_memberId_status_idx" ON "Order"("memberId", "status");
CREATE INDEX IF NOT EXISTS "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CompletedService indexes (for artist performance)
CREATE INDEX IF NOT EXISTS "CompletedService_branchId_completedAt_idx" ON "CompletedService"("branchId", "completedAt");
CREATE INDEX IF NOT EXISTS "CompletedService_artistId_completedAt_idx" ON "CompletedService"("artistId", "completedAt");
CREATE INDEX IF NOT EXISTS "CompletedService_serviceId_completedAt_idx" ON "CompletedService"("serviceId", "completedAt");

