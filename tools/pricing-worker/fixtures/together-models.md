<!-- Fixture: https://docs.together.ai/docs/serverless/models.md taken 2026-10-25, for tools/pricing-worker/test-prices.mjs. -->
> ## Documentation Index
> Fetch the complete documentation index at: https://docs.together.ai/llms.txt
> Use this file to discover all available pages before exploring further.

# Available models

> Browse the catalog of available models for instant inference.

Serverless models are the fastest way to run inference on Together. You call any supported model through a shared per-token API, with no provisioning, no replicas to size, and no minimum cost. Pay only for the tokens you process.

## Models

If you're not sure which model to use, see [Recommended models](https://docs.together.ai/docs/inference/recommended-models.md) for our picks by use case.

> **[Chat](#chat-models)**

> **[Image](#image-models)**

> **[Vision](#vision-models)**

> **[Video](#video-models)**

> **[Audio](#audio-models)**

> **[Embedding](#embedding-models)**

> **[Rerank](#rerank-models)**

> **[Moderation](#moderation-models)**

> [!NOTE]
>
> Serverless and dedicated model inference support different sets of models. See the [dedicated model inference catalog](https://docs.together.ai/docs/dedicated-endpoints/models.md) for details.

For rate limits and pricing, see the [Serverless overview](https://docs.together.ai/docs/serverless/overview.md).

## Chat models

| Organization | Model name | API model string | Context length | Input pricing (per 1M tokens) | Cached input pricing (per 1M tokens) | Output pricing (per 1M tokens) | Quantization | Function calling | Structured outputs |
| :- | :- | :- | :- | :- | :- | :- | :- | :- | :- |
| DeepSeek | DeepSeek V4 Pro 0813 | deepseek-ai/DeepSeek-V4-Pro-0813 | 1048576 | \$1.32 | \$0.13 | \$3.96 | NVFP4 | Yes | Yes |
| DeepSeek | DeepSeek V4.1 Flash | deepseek-ai/DeepSeek-V4.1-Flash | 1000000 | \$0.30 | \$0.006 | \$1.20 | FP8 | Yes | Yes |
| DeepSeek | DeepSeek V4.1 Flash 1017 | deepseek-ai/DeepSeek-V4.1-Flash-1017 | 1000000 | \$0.30 | \$0.006 | \$1.20 | FP8 | Yes | Yes |
| Meta | Muse Glimmer 30B | meta-models/Muse-Glimmer-30B | 131072 | \$0.35 | \$0.04 | \$1.50 | FP8 | Yes | Yes |
| Meta | Muse Spark Open 816B A42B | meta-models/Muse-Spark-Open-816B-A42B | 1048576 | \$1.25 | \$0.15 | \$4.25 | NVFP4 | Yes | Yes |
| Minimax | Minimax M3 | MiniMaxAI/MiniMax-M3 | 524288 | \$0.30 | \$0.06 | \$1.20 | FP4 | Yes | Yes |
| Minimax | Minimax M3.1 Flash | MiniMaxAI/MiniMax-M3.1-Flash | 1048576 | \$0.15 | \$0.015 | \$0.60 | NVFP4 | Yes | Yes |
| Moonshot | Kimi K3 | moonshotai/Kimi-K3 | 1048576 | \$3.00 | \$0.30 | \$15.00 | - | Yes | Yes |
| NVIDIA | NVIDIA Nemotron 3.5 Super VL | nvidia/NVIDIA-Nemotron-3.5-Super-VL | 262144 | \$0.15 | \$0.02 | \$0.50 | NVFP4 | Yes | Yes |
| OpenAI | GPT-OSS 120B | openai/gpt-oss-120b | 131072 | \$0.15 | - | \$0.60 | MXFP4 | Yes | Yes |
| Prism ML | Ternary Bonsai 27B | Prism-ML/Ternary-Bonsai-27B | 262144 | Free | - | Free | - | Yes | Yes |
| Qwen | Qwen3.5 9B | Qwen/Qwen3.5-9B | 262144 | \$0.17 | - | \$0.25 | FP8 | Yes | Yes |
| Qwen | Qwen3.6 Plus | Qwen/Qwen3.6-Plus | 1000000 | \$0.50 | - | \$3.00 | - | Yes | Yes |
| Qwen | Qwen3.7 Max | Qwen/Qwen3.7-Max | - | \$2.50 | \$0.50 | \$7.50 | - | Yes | Yes |
| Qwen | Qwen3.7 Plus | Qwen/Qwen3.7-Plus | 1000000 | \$0.32 | - | \$1.28 | - | Yes | Yes |
| Qwen | Qwen3.8 Flash | Qwen/Qwen3.8-Flash | 1000000 | \$0.15 | - | \$0.47 | - | Yes | Yes |
| Qwen | Qwen3.8-2.4T-A95B | Qwen/Qwen3.8-2.4T-A95B | - | \$2.00 | \$0.50 | \$6.00 | FP4 | Yes | Yes |
| Reflection | Beam 1.0 501B A23B | reflection/Beam-1.0-501B-A23B | 1048576 | \$0.40 | \$0.04 | \$1.20 | NVFP4 | Yes | Yes |
| Thinking Machines | Inkling | thinkingmachines/Inkling | 524288 | \$1.00 | \$0.17 | \$4.05 | NVFP4 | Yes | Yes |
| Together AI | Tev1 4B Experimental | together/Tev1-4B-experimental | 32768 | \$0.042 | - | Free | - | - | - |
| Z.ai | GLM-5.2 | zai-org/GLM-5.2 | 1048575 | \$1.40 | \$0.26 | \$4.40 | FP4 | Yes | Yes |
| Z.ai | GLM-5.3 | zai-org/GLM-5.3 | 1048575 | \$1.40 | \$0.26 | \$4.40 | FP4 | Yes | Yes |
| Z.ai | GLM-5.3 Flash | zai-org/GLM-5.3-Flash | 1048575 | \$0.15 | \$0.03 | \$0.50 | FP4 | Yes | Yes |

**Chat model examples**

* [PDF to chat app](https://www.pdftochat.com/): Chat with your PDFs (blogs, textbooks, papers).
* [Open deep research notebook](https://github.com/togethercomputer/together-cookbook/blob/main/agents/Together_Open_Deep_Research_CookBook.ipynb): Generate long form reports using a single prompt.
* [Fine-tuning chat models notebook](https://github.com/togethercomputer/together-cookbook/blob/main/fine-tuning/Finetuning_Guide.ipynb): Tune language models for conversation.
* [Building agents](https://github.com/togethercomputer/together-cookbook/tree/main/agents): Agent workflows with language models.

## US-only inference

[Geo-specific inference](https://docs.together.ai/docs/serverless/geo-specific-inference.md) keeps inference processing in the United States for requests sent to `us-api.together.ai`. These requests cost 25% more than the standard rates in the [chat models](#chat-models) table. All prices are in USD per 1M tokens.

| Model | Input | Cached input | Output |
| :- | -: | -: | -: |
| Kimi K3 (US-only) | \$3.75 | \$0.375 | \$18.75 |
| GLM-5.3 (US-only) | \$1.75 | \$0.325 | \$5.50 |
| GLM-5.2 (US-only) | \$1.75 | \$0.325 | \$5.50 |
| DeepSeek V4.1 Flash (US-only) | \$0.375 | \$0.0075 | \$1.50 |
| DeepSeek V4.1 Flash 1017 (US-only) | \$0.375 | \$0.0075 | \$1.50 |
| DeepSeek V4 Pro 0813 (US-only) | \$1.65 | \$0.1625 | \$4.95 |
| MiniMax M3 (US-only) | \$0.375 | \$0.075 | \$1.50 |

## Canada-only inference

[Geo-specific inference](https://docs.together.ai/docs/serverless/geo-specific-inference.md) keeps inference processing in Canada for requests sent to `ca-api.together.ai`. These requests cost 1.25× standard serverless rates (a 25% premium) for input, cached input, and output tokens. All prices are in USD per 1M tokens.

| Model | Input | Cached input | Output |
| :- | -: | -: | -: |
| GLM-5.3 (Canada-only) | \$1.75 | \$0.325 | \$5.50 |
| GLM-5.3 Flash (Canada-only) | \$0.1875 | \$0.0375 | \$0.625 |
| GLM-5.2 (Canada-only) | \$1.75 | \$0.325 | \$5.50 |
| DeepSeek V4.1 Flash (Canada-only) | \$0.375 | \$0.0075 | \$1.50 |
| DeepSeek V4 Pro 0813 (Canada-only) | \$1.65 | \$0.1625 | \$4.95 |

## Image models

Use our [Images](https://docs.together.ai/reference/post-images-generations.md) endpoint for image models. Calling image models requires a positive credit balance.

> [!NOTE]
>
> Prices for models billed by `image` are estimates, not rates. These models pass through the provider's own per-request charge, which varies with the resolution, quality, and other parameters you send. Models billed by `megapixel` use the [formula below](#per-megapixel-cost-formula). For more details, see [How image models bill](https://docs.together.ai/docs/serverless/overview.md#how-image-models-bill).

| Organization | Model name | Model string for API | Unit | Price | Output per \$1 |
| :- | :- | :- | :- | :- | :- |
| Black Forest Labs | Flux.1 Kontext \[max] | black-forest-labs/FLUX.1-kontext-max | `megapixel` | \$0.08 | 12 megapixels |
| Black Forest Labs | Flux.1 Kontext \[pro] | black-forest-labs/FLUX.1-kontext-pro | `megapixel` | \$0.04 | 25 megapixels |
| Black Forest Labs | Flux1.1 \[pro] | black-forest-labs/FLUX.1.1-pro | `megapixel` | \$0.04 | 25 megapixels |
| Black Forest Labs | FLUX.2 \[dev] | black-forest-labs/FLUX.2-dev | `image` | \$0.0154+ ([varies](https://docs.together.ai/docs/serverless/overview.md#how-image-models-bill)) | 65 images |
| Black Forest Labs | FLUX.2 \[flex] | black-forest-labs/FLUX.2-flex | `image` | \$0.03+ ([varies](https://docs.together.ai/docs/serverless/overview.md#how-image-models-bill)) | 33 images |
| Black Forest Labs | FLUX.2 \[max] | black-forest-labs/FLUX.2-max | `megapixel` | \$0.07 at 50 steps | 14 megapixels |
| Black Forest Labs | FLUX.2 \[pro] | black-forest-labs/FLUX.2-pro | `image` | \$0.03+ ([varies](https://docs.together.ai/docs/serverless/overview.md#how-image-models-bill)) | 33 images |
| ByteDance | Seedream 3.0 | ByteDance-Seed/Seedream-3.0 | `image` | \$0.018+ ([varies](https://docs.together.ai/docs/serverless/overview.md#how-image-models-bill)) | 56 images |
| ByteDance | Seedream 4.0 | ByteDance-Seed/Seedream-4.0 | `image` | \$0.03+ ([varies](https://docs.together.ai/docs/serverless/overview.md#how-image-models-bill)) | 33 images |
| ByteDance | Seedream 5.0 Lite | ByteDance/Seedream-5.0-lite | `image` | \$0.035+ ([varies](https://docs.together.ai/docs/serverless/overview.md#how-image-models-bill)) | 29 images |
| Google | Flash Image 2.5 (Nano Banana) | google/flash-image-2.5 | `image` | \$0.039+ ([varies](https://docs.together.ai/docs/serverless/overview.md#how-image-models-bill)) | 26 images |
| Google | Gemini 3 Pro Image (Nano Banana Pro) | google/gemini-3-pro-image | `image` | \$0.134 at 1K or 2K ([varies](https://docs.together.ai/docs/serverless/overview.md#how-image-models-bill)) | 7.5 images |
| Google | Gemini 3.1 Flash Image (Nano Banana 2) | google/flash-image-3.1 | `image` | \$0.04657 at 512×512 ([varies](https://docs.together.ai/docs/serverless/overview.md#how-image-models-bill)) | 21 images |
| Google | Gemini 3.1 Flash-Lite Image (Nano Banana 2 Lite) | google/flash-image-3.1-lite | `image` | \$0.069+ ([varies](https://docs.together.ai/docs/serverless/overview.md#how-image-models-bill)) | 14 images |
| Ideogram | Ideogram 3.0 | ideogram/ideogram-3.0 | `image` | \$0.06+ ([varies](https://docs.together.ai/docs/serverless/overview.md#how-image-models-bill)) | 17 images |
| Ideogram | Ideogram 4.0 | ideogram/ideogram-4.0 | `image` | \$0.06+ ([varies](https://docs.together.ai/docs/serverless/overview.md#how-image-models-bill)) | 17 images |
| OpenAI | GPT Image 1.5 | openai/gpt-image-1.5 | `image` | \$0.034+ ([varies](https://docs.together.ai/docs/serverless/overview.md#how-image-models-bill)) | 29 images |
| OpenAI | GPT Image 2 | openai/gpt-image-2 | `image` | \$0.053+ ([varies](https://docs.together.ai/docs/serverless/overview.md#how-image-models-bill)) | 19 images |
| Pruna AI | P-Image-Ideogram | prunaai/p-image-ideogram | `image` | \$0.00225+ ([varies](https://docs.together.ai/docs/serverless/overview.md#how-image-models-bill)) | 444 images |
| Qwen | Qwen Image | Qwen/Qwen-Image | `image` | \$0.0058+ ([varies](https://docs.together.ai/docs/serverless/overview.md#how-image-models-bill)) | 172 images |
| Qwen | Qwen Image 2.0 | Qwen/Qwen-Image-2.0 | `image` | \$0.035+ ([varies](https://docs.together.ai/docs/serverless/overview.md#how-image-models-bill)) | 29 images |
| Qwen | Qwen Image 2.0 Pro | Qwen/Qwen-Image-2.0-Pro | `image` | \$0.075+ ([varies](https://docs.together.ai/docs/serverless/overview.md#how-image-models-bill)) | 13 images |
| RunDiffusion | Juggernaut Lightning Flux | Rundiffusion/Juggernaut-Lightning-Flux | `image` | \$0.0017+ ([varies](https://docs.together.ai/docs/serverless/overview.md#how-image-models-bill)) | 588 images |
| RunDiffusion | Juggernaut Pro Flux | RunDiffusion/Juggernaut-pro-flux | `image` | \$0.0049+ ([varies](https://docs.together.ai/docs/serverless/overview.md#how-image-models-bill)) | 204 images |
| Stability AI | SD XL | stabilityai/stable-diffusion-xl-base-1.0 | `image` | \$0.0019+ ([varies](https://docs.together.ai/docs/serverless/overview.md#how-image-models-bill)) | 526 images |
| Wan-AI | Wan 2.6 Image | Wan-AI/Wan2.6-image | `image` | \$0.03+ ([varies](https://docs.together.ai/docs/serverless/overview.md#how-image-models-bill)) | 33 images |

### **Image model examples**

* [Blinkshot.io](https://www.blinkshot.io/): A realtime AI image playground built with Flux Schnell.
* [Logo creator](https://www.logo-creator.io/): A logo generator that creates professional logos in seconds using Flux Pro 1.1.
* [PicMenu](https://www.picmenu.co/): A menu visualizer that takes a restaurant menu and generates nice images for each dish.

### Per-megapixel cost formula

This applies only to models whose **Unit** column reads `megapixel`. It does not describe how the others are billed.

For these models, cost depends on the size of the generated image in megapixels and on the number of steps used, if that number exceeds the default steps shown alongside the unit.

* **Default pricing:** The listed price is the rate for one megapixel at the default number of steps.
* **Using more or fewer steps:** Costs are adjusted based on the number of steps used **only if you go above the default steps**. If you use more steps, the cost increases proportionally using the formula below. If you use fewer steps, the cost *does not* decrease and is based on the default rate.

Here's a formula to calculate cost:

Cost = MP × Price per MP × (Steps ÷ Default Steps)

Where:

* MP = (Width × Height ÷ 1,000,000).
* Price per MP = the value in the **Price** column.
* Steps = The number of steps used for the image generation. This is only factored in if going above default steps.

Resolution dominates that formula. At \$0.04 per megapixel, a 1024×1024 image (1.05 MP) costs about \$0.042, while a 4096×4096 image (16.8 MP) costs about \$0.67.

### **Gemini 3 Pro Image** pricing

Gemini 3 Pro Image's cost tracks the resolution you request. The catalog above quotes the 1K and 2K estimate of about \$0.134 per image. At 4K it is about \$0.24 per image.

Supported dimensions: 1K: 1024×1024 (1:1), 1264×848 (3:2), 848×1264 (2:3), 1200×896 (4:3), 896×1200 (3:4), 928×1152 (4:5), 1152×928 (5:4), 768×1376 (9:16), 1376×768 (16:9), 1548×672 or 1584×672 (21:9).

2K: 2048×2048 (1:1), 2528×1696 (3:2), 1696×2528 (2:3), 2400×1792 (4:3), 1792×2400 (3:4), 1856×2304 (4:5), 2304×1856 (5:4), 1536×2752 (9:16), 2752×1536 (16:9), 3168×1344 (21:9).

4K: 4096×4096 (1:1), 5096×3392 or 5056×3392 (3:2), 3392×5096 or 3392×5056 (2:3), 4800×3584 (4:3), 3584×4800 (3:4), 3712×4608 (4:5), 4608×3712 (5:4), 3072×5504 (9:16), 5504×3072 (16:9), 6336×2688 (21:9).

## Vision models

If you're not sure which vision model to use, start with **Qwen3.5 9B** (`Qwen/Qwen3.5-9B`). For model-specific rate limits, see [Rate limits](https://docs.together.ai/docs/serverless/rate-limits.md).

| Organization | Model name | API model string | Context length | Input pricing (per 1M tokens) | Output pricing (per 1M tokens) |
| :- | :- | :- | :- | :- | :- |
| Minimax | Minimax M3 | MiniMaxAI/MiniMax-M3 | 524288 | \$0.30 | \$1.20 |
| Moonshot | Kimi K3 | moonshotai/Kimi-K3 | 1048576 | \$3.00 | \$15.00 |
| NVIDIA | NVIDIA Nemotron 3.5 Super VL | nvidia/NVIDIA-Nemotron-3.5-Super-VL | 262144 | \$0.15 | \$0.50 |
| Qwen | Qwen3.5 9B | Qwen/Qwen3.5-9B | 262144 | \$0.17 | \$0.25 |

### **Vision model examples**

* [LlamaOCR](https://llamaocr.com/): A tool that takes documents (like receipts) and outputs markdown.
* [Wireframe to code](https://www.napkins.dev/): A wireframe to app tool that takes in a UI mockup of a site and gives you React code.
* [Extracting structured data from images](https://github.com/togethercomputer/together-cookbook/blob/main/inference/vision/Structured_Text_Extraction_from_Images.ipynb): Extract information from images as JSON.

## Video models

| Organization | Model name | Model string for API | Price per video | Resolution / duration |
| :- | :- | :- | :- | :- |
| Alibaba | HappyHorse 1.0 I2V | alibaba/happyhorse-1.0-i2v | \$0.24 | - |
| Alibaba | HappyHorse 1.0 R2V | alibaba/happyhorse-1.0-r2v | \$0.24 | - |
| Alibaba | HappyHorse 1.0 T2V | alibaba/happyhorse-1.0-t2v | \$0.24 | - |
| Alibaba | HappyHorse 1.1 I2V | alibaba/happyhorse-1.1-i2v | \$0.14 | - |
| Alibaba | HappyHorse 1.1 R2V | alibaba/happyhorse-1.1-r2v | \$0.14 | - |
| Alibaba | HappyHorse 1.1 T2V | alibaba/happyhorse-1.1-t2v | \$0.14 | - |
| Black Forest Labs | FLUX 3 | black-forest-labs/FLUX-3 | \$0.17 | - |
| ByteDance | Seedance 1.0 Lite | ByteDance/Seedance-1.0-lite | \$0.143 | 720p / 5s |
| ByteDance | Seedance 1.0 Pro | ByteDance/Seedance-1.0-pro | \$0.57 | 1080p / 5s |
| ByteDance | Seedance 2.0 | ByteDance/Seedance-2.0 | \$0.16 | - |
| ByteDance | Seedance 2.5 | ByteDance/Seedance-2.5 | \$0.115 | - |
| Google | Veo 3.1 | google/veo-3.1 | \$0.08 | - |
| Google | Veo 3.1 Lite | google/veo-3.1-lite | \$0.05 | - |
| MiniMax | MiniMax 01 Director | minimax/video-01-director | \$0.28 | 720p / 5s |
| MiniMax | MiniMax H3 | MiniMaxAI/MiniMax-H3 | \$0.1391 | 2k / 1s |
| MiniMax | MiniMax Hailuo 02 | minimax/hailuo-02 | \$0.49 | 768p / 10s |
| PixVerse | PixVerse v5 | pixverse/pixverse-v5 | \$0.30 | 1080p / 5s |
| PixVerse | PixVerse v5.6 | pixverse/pixverse-v5.6 | \$0.1326 | - |
| PixVerse | PixVerse v6 | pixverse/pixverse-v6 | \$0.09 | - |
| Vidu | Vidu Q1 | vidu/vidu-q1 | \$0.22 | 1080p / 5s |
| Vidu | Vidu Q3 | vidu/vidu-q3 | \$0.0975 | - |
| Vidu | Vidu Q3 Turbo | vidu/vidu-q3-turbo | \$0.195 | - |
| Wan-AI | Wan 2.7 I2V | Wan-AI/wan2.7-i2v | \$0.10 | - |
| Wan-AI | Wan 2.7 R2V | Wan-AI/wan2.7-r2v | \$0.10 | - |
| Wan-AI | Wan 2.7 T2V | Wan-AI/wan2.7-t2v | \$0.10 | - |

## Audio models

Use our [Audio](https://docs.together.ai/reference/audio-speech.md) endpoint for text-to-speech models. For speech-to-text models see [Transcription](https://docs.together.ai/reference/audio-transcriptions.md) and [Translations](https://docs.together.ai/reference/audio-translations.md).

| Organization | Modality | Model name | Model string for API | Pricing |
| :- | :- | :- | :- | :- |
| Canopy Labs | Text-to-Speech | Orpheus 3B | canopylabs/orpheus-3b-0.1-ft | \$15.00 per 1M chars |
| Cartesia | Text-to-Speech | Cartesia Sonic | cartesia/sonic | \$65.00 per 1M chars |
| Cartesia | Text-to-Speech | Cartesia Sonic 2 | cartesia/sonic-2 | \$65.00 per 1M chars |
| Cartesia | Text-to-Speech | Cartesia Sonic 3 | cartesia/sonic-3 | \$65.00 per 1M chars |
| Kokoro | Text-to-Speech | Kokoro | hexgrad/Kokoro-82M | \$4.00 per 1M chars |
| NVIDIA | Speech-to-Text | NVIDIA Nemotron 3 ASR Streaming 0.6B | nvidia/nemotron-3-asr-streaming-0.6b | \$0.0015 per audio min |
| NVIDIA | Speech-to-Text | NVIDIA Nemotron 3.5 ASR Streaming 0.6B | nvidia/nemotron-3.5-asr-streaming-0.6b | \$0.0015 per audio min |

**Audio model examples**

* [PDF to podcast notebook](https://github.com/togethercomputer/together-cookbook/blob/main/apps/PDF_to_Podcast.ipynb): Generate a NotebookLM style podcast given a PDF.
* [Audio podcast agent workflow](https://github.com/togethercomputer/together-cookbook/blob/main/agents/Serial_Chain_Agent_Workflow.ipynb): Agent workflow to generate audio files given input content.

## Embedding models

There are currently no embedding models offered via serverless.

## Rerank models

There are currently no rerank models offered via serverless. Rerank models like `mixedbread-ai/mxbai-rerank-large-v2` are only available with [dedicated model inference](https://docs.together.ai/docs/dedicated-endpoints/models.md).

## Moderation models

There are currently no moderation models offered via serverless.


This documentation is built and hosted on [Mintlify](https://mintlify.com), a developer documentation platform.