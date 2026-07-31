import { api } from "@/trpc/react"
import { useLocalStorage } from "usehooks-ts"

const useProject = () => {
    const { data: projects } = api.project.getProjects.useQuery()
    const [projectId, setProjectid] = useLocalStorage("APex-projectId", "")
    const project = projects?.find(project => project.id === projectId) ?? projects?.[0]
    return { project, projects, projectId: project?.id ?? projectId, setProjectid }
}

export default useProject