import * as THREE from "three";
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// Botão azul Start AR
const startBtn = document.createElement("button");
startBtn.textContent = "Start AR";
startBtn.style.position = "fixed";
startBtn.style.top = "50%";
startBtn.style.left = "50%";
startBtn.style.transform = "translate(-50%, -50%)";
startBtn.style.padding = "20px 40px";
startBtn.style.fontSize = "24px";
startBtn.style.background = "#007bff";
startBtn.style.color = "white";
startBtn.style.border = "none";
startBtn.style.borderRadius = "8px";
startBtn.style.cursor = "pointer";
startBtn.style.zIndex = "1000";
document.body.appendChild(startBtn);

let camera, scene, renderer;
let model = null;
let modelLoading = false;

let hitTestSource = null;
let localSpace = null;
let xrSession = null;

startBtn.addEventListener("click", () => {
  startBtn.style.display = "none";
  init();
  animate();
});

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    20
  );

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // Botão AR padrão
  document.body.appendChild(
    ARButton.createButton(renderer, { requiredFeatures: ["hit-test"] })
  );

  // Luz
  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  window.addEventListener("resize", onWindowResize);

  // Evento de sessão AR
  renderer.xr.addEventListener("sessionstart", async () => {
    xrSession = renderer.xr.getSession();

    // Hit test
    const viewerSpace = await xrSession.requestReferenceSpace("viewer");
    hitTestSource = await xrSession.requestHitTestSource({
      space: viewerSpace,
    });
    localSpace = await xrSession.requestReferenceSpace("local");
  });

  renderer.xr.addEventListener("sessionend", () => {
    hitTestSource = null;
    localSpace = null;
    xrSession = null;
  });
}

// Função para colocar ou mover o modelo na superfície detectada
function placeModelFromHitTest(frame) {
  if (!hitTestSource || !frame) return;

  const hitTestResults = frame.getHitTestResults(hitTestSource);
  if (hitTestResults.length > 0) {
    const hit = hitTestResults[0];
    const pose = hit.getPose(localSpace);

    if (!model && !modelLoading) {
      modelLoading = true;
      const loader = new GLTFLoader();
      loader.load(
        "/elefante.glb",
        (gltf) => {
          model = gltf.scene;
          model.scale.set(0.02, 0.02, 0.02); // Escala fixa
          model.position.set(
            pose.transform.position.x,
            pose.transform.position.y,
            pose.transform.position.z
          );
          scene.add(model);
          modelLoading = false;
        },
        undefined,
        (err) => {
          console.error("Erro ao carregar modelo:", err);
          modelLoading = false;
        }
      );
    } else if (model) {
      model.position.set(
        pose.transform.position.x,
        pose.transform.position.y,
        pose.transform.position.z
      );
    }
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render(timestamp, frame) {
  // Atualiza posição do modelo via hit-test
  if (frame) placeModelFromHitTest(frame);

  renderer.render(scene, camera);
}
