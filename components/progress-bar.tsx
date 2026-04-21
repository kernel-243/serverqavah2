"use client"

import type React from "react"

import { motion } from "framer-motion"

interface ProgressBarProps {
  total: number
  paid: number
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ total, paid }) => {
  const percentage = (paid / total) * 100

  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
      <motion.div
        className="bg-primary h-2.5 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </div>
  )
}

