import * as BABYLON from "babylonjs";
import "babylonjs-loaders";
import "babylonjs-gui"; // só se for usar UI

// ----- Configuração inicial -----
const canvas = document.createElement("canvas");
canvas.style.width = "100%";
canvas.style.height = "100%";
canvas.style.touchAction = "none"; // necessário para gestos
document.body.appendChild(canvas);

const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);

// ----- Luz e câmera -----
const light = new BABYLON.HemisphericLight(
  "hemi",
  new BABYLON.Vector3(0, 1, 0),
  scene
);

const camera = new BABYLON.UniversalCamera(
  "cam",
  new BABYLON.Vector3(0, 1.6, 0),
  scene
);
camera.attachControl(canvas, true);

// ----- Variáveis globais -----
let model = null;
const MODEL_SCALE = 0.02;
const MODEL_DISTANCE = 1.5;

// ----- Botão Start AR -----
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

// ----- Start AR -----
startBtn.addEventListener("click", async () => {
  startBtn.style.display = "none";

  // Inicializa WebXR
  const xr = await scene.createDefaultXRExperienceAsync({
    uiOptions: { sessionMode: "immersive-ar" },
    optionalFeatures: true,
  });

  // Carrega modelo 3D
  BABYLON.SceneLoader.ImportMesh(
    "",
    "/",
    "elefante.glb",
    scene,
    function (meshes) {
      model = meshes[0];
      model.scaling.scaleInPlace(MODEL_SCALE);
      updateModelPosition();
    }
  );

  // Habilita gestos de rotação (XRGestures)
  if (xr.baseExperience) {
    const xrGestures = BABYLON.XRGestures.XRGesturesHelper.CreateDefault(
      xr.baseExperience,
      scene
    );

    xrGestures.twoFingerRotation = true; // ativa rotação com dois dedos
    xrGestures.onTwoFingerRotationObservable.add((rotationDelta) => {
      if (model)
        model.rotate(BABYLON.Axis.Y, rotationDelta, BABYLON.Space.WORLD);
    });
  }
});

// ----- Atualiza posição do modelo à frente da câmera -----
function updateModelPosition() {
  if (!model) return;
  const forward = camera.getForwardRay(MODEL_DISTANCE);
  model.position = forward.origin.add(forward.direction.scale(MODEL_DISTANCE));
}

// ----- Loop de render -----
engine.runRenderLoop(() => {
  scene.render();
});

// ----- Resize -----
window.addEventListener("resize", () => {
  engine.resize();
});
