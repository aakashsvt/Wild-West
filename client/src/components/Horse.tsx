import { useFBX, useAnimations } from "@react-three/drei"
import { useRef, useEffect } from "react"

export function Horse(props: any) {

    const group = useRef<any>()

    const horse = useFBX("/models/horse1.fbx")

    const { animations } = horse

    const { actions } = useAnimations(animations, group)
    console.log(
        "Animations: ", actions
    )

    useEffect(() => {

        actions[Object.keys(actions)[0]]?.play()

    }, [])

    return (
        <primitive
            ref={group}
            object={horse}
            {...props}
            scale={0.02}
        />
    )
}