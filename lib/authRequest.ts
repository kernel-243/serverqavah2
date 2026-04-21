import axios from "axios"

export async function authRequest(url: string, options: any = {}) {
  const token = localStorage.getItem("authToken")
  const baseUrl = process.env.API_URL || "https://646b-207-96-240-194.ngrok-free.app"

  // Remove the environment variable from the URL if it exists
  const cleanUrl = url.replace(process.env.NEXT_PUBLIC_API_URL || "", "")
  const fullUrl = `${baseUrl}${cleanUrl}`

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }

  try {
    const response = await axios({
      ...options,
      url: fullUrl,
      headers,
    })

    return response
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      // Token is invalid or expired
      localStorage.removeItem("authToken")
      window.location.href = "/auth/login"
      throw new Error("Unauthorized")
    }
    throw error
  }
}

