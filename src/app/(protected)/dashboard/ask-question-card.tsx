"use client"

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import useProject from '@/hooks/use-project'
import Image from 'next/image'
import React from 'react'

const AskQuestionCard = () => {
    const { project } = useProject()
    const [question, setQuestion] = React.useState('')
    const [open, setOpen] = React.useState(false)

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setOpen(true)
    }

    return (
        <>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogHeader>
                    <DialogTitle>
                        <Image src='/logo.svg' alt="Apex AI" width={40} height={40} />
                    </DialogTitle>
                </DialogHeader>

            </Dialog>
            <Card className='relative col-span-3 '>
                <CardHeader>
                    <CardTitle>Ask a question...</CardTitle>
                    <CardContent>
                        <form onSubmit={onSubmit}>
                            <Textarea
                                placeholder="Which file should i edit to change the home page?" value={question} onChange={(e) => setQuestion(e.target.value)}
                            />
                            <div className="h-4"></div>
                            <Button type='submit'>Ask Apex AI </Button>
                        </form>
                    </CardContent>
                </CardHeader>
            </Card>
        </>
    )
}

export default AskQuestionCard;    