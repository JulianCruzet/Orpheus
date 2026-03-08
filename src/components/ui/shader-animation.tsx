"use client"

import { useEffect, useRef, useState } from "react"
import * as THREE from "three"

export function ShaderAnimation() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<{
    camera: THREE.Camera
    scene: THREE.Scene
    renderer: THREE.WebGLRenderer
    uniforms: any
    animationId: number
  } | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    let cancelled = false

    // Delay WebGL init until hero text animations have finished painting.
    // WebGLRenderer creation + shader compilation is a synchronous main-thread
    // block (~200-500ms) that cannot be avoided — so we push it past the point
    // where the user is already reading the visible text.
    const initTimer = setTimeout(() => {
      if (cancelled || !containerRef.current) return

      const vertexShader = `
        void main() {
          gl_Position = vec4( position, 1.0 );
        }
      `

      const fragmentShader = `
        #define TWO_PI 6.2831853072
        #define PI 3.14159265359

        precision highp float;
        uniform vec2 resolution;
        uniform float time;

        void main(void) {
          vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
          float t = time*0.05;
          float lineWidth = 0.002;

          vec3 color = vec3(0.0);
          for(int j = 0; j < 3; j++){
            for(int i=0; i < 5; i++){
              color[j] += lineWidth*float(i*i) / abs(fract(t - 0.01*float(j)+float(i)*0.01)*5.0 - length(uv) + mod(uv.x+uv.y, 0.2));
            }
          }

          gl_FragColor = vec4(color[0],color[1],color[2],1.0);
        }
      `

      const camera = new THREE.Camera()
      camera.position.z = 1

      const scene = new THREE.Scene()
      const geometry = new THREE.PlaneGeometry(2, 2)

      const uniforms = {
        time: { type: "f", value: 1.0 },
        resolution: { type: "v2", value: new THREE.Vector2() },
      }

      const material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
      })

      const mesh = new THREE.Mesh(geometry, material)
      scene.add(mesh)

      const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "low-power" })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))

      container.appendChild(renderer.domElement)

      const onWindowResize = () => {
        const width = container.clientWidth
        const height = container.clientHeight
        renderer.setSize(width, height)
        uniforms.resolution.value.x = renderer.domElement.width
        uniforms.resolution.value.y = renderer.domElement.height
      }

      let resizeTimer: ReturnType<typeof setTimeout>
      const debouncedResize = () => {
        clearTimeout(resizeTimer)
        resizeTimer = setTimeout(onWindowResize, 150)
      }

      onWindowResize()
      window.addEventListener("resize", debouncedResize, false)

      sceneRef.current = {
        camera,
        scene,
        renderer,
        uniforms,
        animationId: 0,
      }

      // Render one frame, then signal ready so the canvas fades in
      renderer.render(scene, camera)
      setReady(true)

      const animate = () => {
        const animationId = requestAnimationFrame(animate)
        uniforms.time.value += 0.05
        renderer.render(scene, camera)

        if (sceneRef.current) {
          sceneRef.current.animationId = animationId
        }
      }

      animate()

      // Store cleanup references on the container for the effect teardown
      ;(container as any).__shaderCleanup = () => {
        clearTimeout(resizeTimer)
        window.removeEventListener("resize", debouncedResize)

        if (sceneRef.current) {
          cancelAnimationFrame(sceneRef.current.animationId)

          if (container && sceneRef.current.renderer.domElement) {
            container.removeChild(sceneRef.current.renderer.domElement)
          }

          sceneRef.current.renderer.dispose()
          geometry.dispose()
          material.dispose()
        }
      }
    }, 1500)

    return () => {
      cancelled = true
      clearTimeout(initTimer)
      if ((container as any).__shaderCleanup) {
        ;(container as any).__shaderCleanup()
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="w-full h-screen"
      style={{
        background: "#000",
        overflow: "hidden",
        opacity: ready ? 1 : 0,
        transition: "opacity 0.8s ease-out",
      }}
    />
  )
}
