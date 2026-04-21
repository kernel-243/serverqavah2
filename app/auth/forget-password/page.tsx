"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Icons } from "@/components/icons"
import Link from "next/link"

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
})

export default function ForgetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
  })

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    // console.log(data)
    setIsLoading(false)
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Forgot Password</CardTitle>
        <CardDescription>Enter your email address and we&apos;ll send you a reset link</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="m@example.com" {...register("email")} />
            {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
          </div>
          <Button className="w-full mt-4" type="submit" disabled={isLoading}>
            {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            Send Reset Link
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Link href="/auth/login" className="text-sm text-muted-foreground hover:underline">
          Back to login
        </Link>
      </CardFooter>
    </Card>
  )
}

