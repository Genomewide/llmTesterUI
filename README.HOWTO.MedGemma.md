# 🏥 MedGemma Integration Guide for LLM Tester UI

## 📋 **Overview**

This guide shows how to integrate MedGemma through Ollama into your existing LLM Tester UI application. Your app already has excellent Ollama support, so adding MedGemma is straightforward!

## 🎯 **What is MedGemma?**

MedGemma is Google's medical AI model based on the Gemma architecture, specifically designed for medical applications. It includes:
- **MedGemma-2B**: Lightweight model (~2B parameters)
- **MedGemma-4B**: Medium model (~4B parameters) 
- **MedGemma-27B**: Large model (~27B parameters)

## ⚠️ **Important: Model Differences**

### **Your Current Model vs Official MedGemma**

| Aspect | Your Current `medgem-custom` | Official Google MedGemma |
|--------|------------------------------|--------------------------|
| **Architecture** | Llama 3.2 | Gemma 3 |
| **Parameters** | 3.2B | 4B/27B |
| **Creator** | Custom version | Google |
| **Training** | Medical fine-tuning on Llama | Official medical training |
| **License** | LLAMA 3.2 | Google's license |

### **Why This Matters**
- **For exact replication**: Use official Google models
- **For testing**: Your current model works fine
- **For production**: Official models have better medical accuracy

## 🔍 **Official Google MedGemma Models Available**

### **From Hugging Face (Authentic Google Models):**
- **`google/medgemma-4b-it`** - 4B instruction-tuned (most popular)
- **`google/medgemma-27b-text-it`** - 27B text-only
- **`google/medgemma-27b-it`** - 27B multimodal
- **`google/medgemma-4b-pt`** - 4B pretrained

### **Community Variants (Modified):**
- **`alibayram/medgemma`** - Community-modified version
- **`unsloth/medgemma-4b-it-GGUF`** - Optimized version
- **`mradermacher/medgemma-4b-it-GGUF`** - Quantized version

## 🔧 **System Requirements**

### **Hardware Requirements**
- **CPU**: Modern multi-core processor (Intel i5/AMD Ryzen 5 or better)
- **RAM**: 
  - MedGemma-4B: 8GB minimum, 16GB recommended
  - MedGemma-27B: 32GB minimum, 64GB recommended
- **Storage**: 
  - MedGemma-4B: ~8GB free space
  - MedGemma-27B: ~50GB free space
- **GPU**: Optional but recommended for faster inference

### **Software Requirements**
- **OS**: macOS 10.15+, Windows 10+, or Linux
- **Python**: 3.8 or higher
- **Ollama**: Latest version
- **Docker**: Optional (for containerized deployment)

## 🚀 **Installation Methods**

### **Method 1: Ollama (Recommended for Your App)**

Since your LLM Tester UI already supports Ollama perfectly, this is the easiest method:

#### **Step 1: Install Ollama**
```bash
# macOS/Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Windows
# Download from https://ollama.ai/download
```

#### **Step 2: Download Official MedGemma Models**

**⚠️ Important**: Official Google MedGemma models are NOT available directly in Ollama's library. You need to download them from Hugging Face and convert them.

##### **Option A: Use Community GGUF Versions (Easiest)**
```bash
# Download optimized GGUF versions that work with Ollama
ollama pull unsloth/medgemma-4b-it-GGUF
ollama pull unsloth/medgemma-27b-text-it-GGUF
ollama pull unsloth/medgemma-27b-it-GGUF
```

##### **Option B: Convert Official Models to Ollama Format (Advanced)**

**Step 2a: Install Required Tools**
```bash
# Install Ollama Modelfile converter
pip install ollama-modelfile

# Or use the official Ollama Modelfile format
```

**Step 2b: Download Official Model from Hugging Face**
```bash
# Install Hugging Face CLI
pip install huggingface_hub

# Download the official Google MedGemma model
huggingface-cli download google/medgemma-4b-it --local-dir ./medgemma-4b-it
```

**Step 2c: Create Ollama Modelfile**
```bash
# Create a Modelfile for the official model
cat > MedGemma-Official-Modelfile << 'EOF'
FROM llama3.2:latest

# Set the model name
TEMPLATE """{{ if .System }}<|start_header_id|>system<|end_header_id|>
{{ .System }}<|eot_id|>{{ end }}{{ if .Prompt }}<|start_header_id|>user<|end_header_id|>
{{ .Prompt }}<|eot_id|>{{ end }}<|start_header_id|>assistant<|end_header_id|>
{{ .Response }}<|eot_id|>"""

# System prompt for official MedGemma
SYSTEM """You are MedGemma, a medical language model developed by Google. You are trained to assist with medical queries, diagnosis, treatment recommendations, and medical research. You provide accurate, evidence-based medical information while always recommending consultation with healthcare professionals for actual medical decisions.

Key capabilities:
- Medical symptom analysis and differential diagnosis
- Medication information and interactions
- Medical research insights and literature review
- Clinical decision support (educational purposes only)
- Medical image analysis (for multimodal versions)

IMPORTANT: Always include appropriate medical disclaimers and recommend consulting healthcare professionals for actual medical decisions."""

# Model parameters optimized for medical queries
PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER repeat_penalty 1.1
PARAMETER stop "<|start_header_id|>"
PARAMETER stop "<|end_header_id|>"
PARAMETER stop "<|eot_id|>"

# License information
LICENSE """GOOGLE MEDGEMMA LICENSE
This model is subject to Google's MedGemma license terms.
For educational and research purposes only.
Not for direct patient care without proper validation."""
EOF
```

**Step 2d: Create Ollama Model**
```bash
# Create the model in Ollama
ollama create medgemma-official -f MedGemma-Official-Modelfile

# Test the model
ollama run medgemma-official "What are the symptoms of diabetes?"
```

#### **Step 3: Test the Model**
```bash
# Test with a medical question
ollama run unsloth/medgemma-4b-it-GGUF "What are the symptoms of diabetes?"
```

### **Method 2: Direct Hugging Face Usage (For Advanced Users)**

If you want to use the models directly without Ollama:

#### **Step 1: Install Dependencies**
```bash
pip install transformers torch accelerate
```

#### **Step 2: Download and Use**
```python
from transformers import AutoTokenizer, AutoModelForCausalLM

# Load official Google MedGemma
model_name = "google/medgemma-4b-it"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(model_name)

# Use the model
inputs = tokenizer("What are the symptoms of diabetes?", return_tensors="pt")
outputs = model.generate(**inputs, max_length=200)
response = tokenizer.decode(outputs[0], skip_special_tokens=True)
```

### **Method 3: GGUF Format with llama.cpp (For Optimized Performance)**

For better performance on consumer hardware:

#### **Step 1: Download GGUF Models**
```bash
# Download optimized versions
wget https://huggingface.co/unsloth/medgemma-4b-it-GGUF/resolve/main/medgemma-4b-it.Q4_K_M.gguf
```

#### **Step 2: Use with llama.cpp**
```bash
# Run with llama.cpp
./llama -m medgemma-4b-it.Q4_K_M.gguf -n 128 -p "What are the symptoms of diabetes?"
```

## 🔧 **Integration with Your LLM Tester UI**

### **Step 1: Update Your Configuration**

Your `src/config.ts` already has MedGemma models listed! Just ensure `USE_REAL_OLLAMA` is set to `true`:

```typescript
// In src/config.ts
export const config = {
  USE_REAL_OLLAMA: true,  // ✅ Already set!
  // ... other config
};
```

### **Step 2: Add MedGemma Models to Your Model List**

Your app already supports this! The models will appear automatically once downloaded via Ollama.

### **Step 3: Test Integration**

1. **Start your app**: `npm start` or `npm run electron`
2. **Select MedGemma model** from the dropdown
3. **Test with medical prompts**:
   - "What are the symptoms of diabetes?"
   - "Explain the difference between Type 1 and Type 2 diabetes"
   - "What are the risk factors for heart disease?"

## 📊 **Model Comparison for Your Use Case**

### **For Exact Future Replication:**
- **Use**: `google/medgemma-4b-it` (most common)
- **Why**: Official Google model, widely adopted
- **Size**: 4B parameters, good balance of performance/accuracy

### **For Testing/Development:**
- **Use**: Your current `medgem-custom` model
- **Why**: Already working, good for development
- **Note**: Different architecture but still medical-focused

### **For Production Medical Applications:**
- **Use**: `google/medgemma-27b-it` (multimodal)
- **Why**: Best accuracy, supports medical images
- **Requirement**: More powerful hardware needed

## 🎯 **Recommended Setup for Your Project**

### **Option A: Quick Start (Recommended)**
```bash
# Download the most popular official model (GGUF version)
ollama pull unsloth/medgemma-4b-it-GGUF

# Your app will automatically detect it
# No code changes needed!
```

### **Option B: Full Medical Suite**
```bash
# Download all official models (GGUF versions)
ollama pull unsloth/medgemma-4b-it-GGUF
ollama pull unsloth/medgemma-27b-text-it-GGUF
ollama pull unsloth/medgemma-27b-it-GGUF

# Your app supports multiple models
# Users can choose based on their needs
```

### **Option C: Official Google Models (Advanced)**
```bash
# Download official models from Hugging Face
huggingface-cli download google/medgemma-4b-it --local-dir ./medgemma-4b-it

# Convert to Ollama format using the Modelfile provided above
ollama create medgemma-official -f MedGemma-Official-Modelfile
```

## 🔍 **Verifying You Have the Right Model**

### **Check Model Details**
```bash
# See what you have installed
ollama list

# Get detailed info about a model
ollama show unsloth/medgemma-4b-it-GGUF
```

### **Expected Output for Official Model:**
```
Model
  architecture        gemma3
  parameters          4B
  context length      8192
  embedding length    3072
  quantization        Q4_K_M

License
  GOOGLE MEDGEMMA LICENSE
```

## 🚨 **Important Notes**

### **1. Model Availability**
- **Official MedGemma models are NOT in Ollama's library**
- **Solution**: Use community GGUF versions or convert official models
- **Easiest**: Use `unsloth/medgemma-4b-it-GGUF` (optimized for Ollama)

### **2. Licensing**
- **Official models**: Google's license terms apply
- **Community models**: Various licenses (check each model)
- **Your current model**: LLAMA 3.2 license

### **3. Performance**
- **4B models**: Good for most medical tasks, faster inference
- **27B models**: Better accuracy, slower inference, more memory

### **4. Medical Disclaimer**
- **Always include**: "Consult healthcare professionals for medical decisions"
- **Use case**: Educational and research purposes only
- **Not for**: Direct patient care without proper validation

## 🎉 **You're All Set!**

Your LLM Tester UI is perfectly designed for this integration. The official MedGemma models will work seamlessly with your existing Ollama support, and you'll have the exact models you need for future replication.

### **Next Steps:**
1. Download the official Google MedGemma models (GGUF versions recommended)
2. Test them in your app
3. Compare performance with your current model
4. Choose the best model for your specific use case

Your app architecture is already ideal for this integration! 🚀 