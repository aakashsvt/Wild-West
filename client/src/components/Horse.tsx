import { useFBX, useAnimations, useGLTF } from "@react-three/drei"
import { useRef, useEffect } from "react"

export function Horse(props: any) {

    const group = useRef<any>()

    const horse = useFBX("/models/horse1.fbx")
    const cowboy = useGLTF("/models/CowboyXHorse_GLB_V08.glb")
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
            object={cowboy}
            {...props}
            scale={0.1}
        />
    )
}

useGLTF.preload("/models/CowboyXHorse_GLB_V08.glb");
