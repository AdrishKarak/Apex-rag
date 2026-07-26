"use client"

import React from 'react'
import { useUser } from '@clerk/nextjs'
import useProject from '@/hooks/use-project'

const page = () => {
    const { user } = useUser()
    const { project } = useProject()
    return (
        <div>{project?.name}</div>
    )
}

export default page