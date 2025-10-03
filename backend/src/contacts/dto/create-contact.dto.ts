export class CreateContactDto {
  name: string;
  email: string;
  phone?: string;
  branchId: string;
  notes?: string;
}
