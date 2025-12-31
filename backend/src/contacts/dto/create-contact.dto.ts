export class CreateContactDto {
  name: string;
  email: string;
  phone?: string;
  branchId: string;
  ownerArtistId?: string;
  notes?: string;
}
