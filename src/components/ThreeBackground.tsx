import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export const ThreeBackground: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // Neural Nodes Geometry
    const particlesCount = 100;
    const positions = new Float32Array(particlesCount * 3);
    const velocities = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
      
      velocities[i * 3] = (Math.random() - 0.5) * 0.005;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.005;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.005;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      size: 0.05,
      color: '#3490dc',
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    });

    const nodes = new THREE.Points(geometry, material);
    scene.add(nodes);

    // Lines between nodes
    const linesMaterial = new THREE.LineBasicMaterial({
      color: '#3490dc',
      transparent: true,
      opacity: 0.1,
    });

    camera.position.z = 5;

    const animate = () => {
      requestAnimationFrame(animate);

      const positionsAttr = geometry.attributes.position as THREE.BufferAttribute;
      
      for (let i = 0; i < particlesCount; i++) {
        positionsAttr.setX(i, positionsAttr.getX(i) + velocities[i * 3]);
        positionsAttr.setY(i, positionsAttr.getY(i) + velocities[i * 3 + 1]);
        positionsAttr.setZ(i, positionsAttr.getZ(i) + velocities[i * 3 + 2]);

        // Bounce back
        if (Math.abs(positionsAttr.getX(i)) > 5) velocities[i * 3] *= -1;
        if (Math.abs(positionsAttr.getY(i)) > 5) velocities[i * 3 + 1] *= -1;
        if (Math.abs(positionsAttr.getZ(i)) > 5) velocities[i * 3 + 2] *= -1;
      }
      
      positionsAttr.needsUpdate = true;
      nodes.rotation.y += 0.0005;
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.4 }}
    />
  );
};
