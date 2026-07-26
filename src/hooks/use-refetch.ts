import { useQueryClient } from "@tanstack/react-query"


const userefetch = () => {
    const queryClient = useQueryClient()
    return async () => {
        await queryClient.refetchQueries({
            type: "active"
        })
    }
}

export default userefetch
