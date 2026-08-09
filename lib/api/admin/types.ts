export interface AdminProfile {
  id: number
  name: string
  email: string
  createdAt: string
}
export interface AdminRegisterPayload {
  name: string
  email: string
  password: string
}
export type UpdateAdminProfilePayload = Pick<AdminProfile, 'name'>
