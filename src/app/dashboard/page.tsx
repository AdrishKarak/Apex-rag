"use client"

import React from 'react'
import { useUser } from '@clerk/nextjs'

const page = () => {
    const { user } = useUser()
    return (
        <div>{user?.firstName}</div>
    )
}

export default page