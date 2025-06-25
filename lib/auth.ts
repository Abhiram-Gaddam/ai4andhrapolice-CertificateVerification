// Simplified auth - no authentication required
export interface User {
  id: string
  email: string
  name: string
}

export const getCurrentUser = async (): Promise<User> => {
  // Return a default admin user
  return {
    id: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
  }
}

export const signIn = async (email: string, password?: string): Promise<void> => {
  if (email !== "admin@example.com") {
    throw new Error("Invalid credentials")
  }
  // In a real application, you would authenticate against a database or auth provider
  // For this simplified example, we just check the email
  return Promise.resolve()
}
