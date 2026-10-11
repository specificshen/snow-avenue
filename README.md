# Snow Avenue · 雪中秋林路

把一张照片（初雪后的秋日公园林荫路：左侧红枫与金黄树冠，右侧挂雪赭色细枝，湿沥青路、浓雾、两盏路灯和一段栏杆）用 **Three.js r186** 做成的实时 3D 场景。完全程序化生成，没有外部贴图或模型文件。

## 运行

```bash
bun install && bun run dev
```

用 Chrome / Edge 打开终端里的地址（默认 http://127.0.0.1:5173）。`bun run build` 产物在 `dist/`。

## 技术栈

- **Bun + Vite + TypeScript**
- **three@0.186.1**（`@types/three@0.186.0`）
- 渲染：**优先 WebGPU**（`three/webgpu`），失败或不支持时自动回退 **WebGL2**
- 色调映射：ACES Filmic（本场景试过 AgX，整体偏暗，最终留在 ACES）
- 路面：`MeshPhysicalMaterial` 清漆 + **自定义平面反射**（镜像相机 → RT → roughness/Fresnel 混合）；枝干顶点色积雪；双层软边树冠壳
- 截图：Xvfb + 有头 Chrome（SwiftShader）+ Playwright（`scripts/capture.mjs`）

## 操作

- 按住鼠标左右拖：镜头左右转一点（±0.3 弧度）。机位按照片固定，不提供漫游。
- 默认有缓慢飘雪。

## URL 参数

| 参数 | 说明 |
|---|---|
| `renderer=auto\|webgl\|webgpu` | 默认 `auto`（先试 WebGPU）。截图/对比请用 `webgl` |
| `quality=low\|medium\|high` | 叶片密度和像素比，默认 `medium` |
| `dpr=2` | 覆盖像素比（交付截图常用 `dpr=2` → 1070×2048） |
| `snow=0` | 关闭飘雪 |
| `fixed` | 定格（不飘雪、镜头不动，截图用） |
| `size=535x1024` | 固定画布尺寸 |
| `mask=road` | 只画路面掩码（对比工具用） |
| `seed=7` | 随机种子 |

## 结构

- `src/camera.ts`：照片对齐相机（眼高 1.6 m，垂直 FOV 78°，镜头平移对齐消失点）
- `src/layout.ts`：按照片 UV 写的树、路灯、栏杆、雾与天空表
- `src/tree.ts`：带积雪顶点色的枝干、实例化叶片；右侧挂雪细枝与中景雾带填充
- `src/road.ts` / `src/world.ts`：湿路面、路肩、落叶、远景树、飘雪
- `src/renderer.ts`：WebGPU / WebGL 创建与色调映射
- `scripts/capture.mjs`、`tools/iter.sh`、`tools/compare.py`、`tools/regions.py`：截图与叠图对比

## 和照片的差距（诚实说明）

这是程序化实时场景，**不是照片级复刻**。当前网格色差约 **22–23/255**，路面 IoU 约 **0.95**。

仍然明显的差距：

1. **叶片**：软边叶形卡片簇（非大颜料团）；仍不及照片的绒密体积。
2. **路面**：泥泞湿沥青（水洼斑驳、车辙湿痕、落叶）；反射仅在低粗糙度水洼里破碎出现，不是镜面。
3. **中景雾带**：已加灰枝网，仍比照片亮、疏。
4. **远树**：仍偏细杆。

路面仍是程序化 stylized：细颗粒、湿车辙破碎反光和疏落叶有改善，但达不到照片的真实沥青颗粒与光学湿反光。树冠也仍是叶卡。

## 截图 / 对比

```bash
bun run build
bun run preview   # 另开终端
xvfb-run -a -s "-screen 0 1400x2200x24" node scripts/capture.mjs
OUT=screenshots/mask.png QUERY=mask=road xvfb-run -a -s "-screen 0 1400x2200x24" node scripts/capture.mjs
bun run compare -- screenshots/render.png screenshots/mask.png
# 或：tools/iter.sh
```

产物：`screenshots/render.png`、`compare/side-by-side.png`、`compare/overlay.png`。
