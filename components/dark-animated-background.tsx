"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"

export const DarkAnimatedBackground = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [bubblePositions, setBubblePositions] = useState(
    [...Array(50)].map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
    })),
  )

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
      setBubblePositions((prevPositions) =>
        prevPositions.map((pos) => ({
          x: pos.x + (e.clientX - window.innerWidth / 2) / 5000,
          y: pos.y + (e.clientY - window.innerHeight / 2) / 5000,
        })),
      )
    }

    window.addEventListener("mousemove", handleMouseMove)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [])

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden">
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900"
        animate={{
          backgroundPosition: `${mousePosition.x / 20}px ${mousePosition.y / 20}px`,
        }}
        transition={{ type: "spring", damping: 10, stiffness: 50 }}
      />
      {bubblePositions.map((position, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-blue-500"
          style={{
            width: Math.random() * 20 + 5,
            height: Math.random() * 20 + 5,
          }}
          animate={{
            x: `${position.x}%`,
            y: `${position.y}%`,
            scale: [1, 1.1, 1],
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{
            x: { type: "spring", stiffness: 20, damping: 15 },
            y: { type: "spring", stiffness: 20, damping: 15 },
            scale: { duration: Math.random() * 3 + 2, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" },
            opacity: { duration: Math.random() * 3 + 2, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" },
          }}
        />
      ))}
    </div>
  )
}

