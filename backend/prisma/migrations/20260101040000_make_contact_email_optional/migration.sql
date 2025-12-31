-- Make Contact.email optional to support public contact form without email.
ALTER TABLE "Contact" ALTER COLUMN "email" DROP NOT NULL;


