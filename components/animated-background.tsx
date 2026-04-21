"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"

export const AnimatedBackground = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener("mousemove", handleMouseMove)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [])

  return (
    <div className="fixed inset-0 -z-10">
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600"
        animate={{
          backgroundPosition: `${mousePosition.x / 5}px ${mousePosition.y / 5}px`,
        }}
        transition={{ type: "spring", damping: 10, stiffness: 50 }}
      />
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white opacity-10"
          style={{
            width: Math.random() * 100 + 20,
            height: Math.random() * 100 + 20,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: Math.random() * 5 + 5,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
          }}
        />
      ))}
    </div>
  )
}

