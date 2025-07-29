# LLM Tester UI

A modern React TypeScript application for testing and comparing local LLM models with a focus on system prompts, structured outputs, and project organization. **Now with Electron support for handling large files (up to 100MB) and local file system storage.**

## Features

- **Model Selection**: Dropdown to select from available local LLM models
- **System Prompt Editor**: Easy-to-use interface for editing system prompts
- **User Input Area**: Large text area for input text processing
- **Structured Output Support**: Toggle for JSON, XML, YAML, and CSV outputs
- **Project Management**: Organize tests into projects with history tracking
- **Response Comparison**: Side-by-side comparison of different model responses
- **History Tracking**: Complete history of all interactions with metadata
- **Modern UI**: Built with Material-UI for a professional look and feel
- **Large File Processing**: Upload and process large JSON, CSV, YAML, and XML files (up to 100MB)
- **Data Subset Creation**: Create filtered subsets of uploaded data for targeted analysis
- **Local File Storage**: Store projects and data on your local file system (Electron mode)
- **Cross-Platform**: Available as both web application and desktop application

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Local LLM service (Ollama, etc.) running on your machine

## Installation

### Quick Setup (Recommended)

1. Navigate to the project directory:
```bash
cd llmTesterUI
```

2. Run the automated setup script:
```bash
chmod +x setup.sh
./setup.sh
```

The setup script will:
- Check Node.js version requirements
- Install all dependencies (including Electron)
- Create a `.env` file with default configuration
- Create data directories for file storage
- Provide next steps for running the application

### Manual Setup

1. Navigate to the project directory:
```bash
cd llmTesterUI
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (optional):
```bash
# LLM Tester UI Configuration
REACT_APP_API_URL=http://localhost:3001
REACT_APP_OLLAMA_URL=http://localhost:11434
```

4. Create data directories:
```bash
mkdir -p data/projects data/uploads data/exports
```

5. Start the application:
   - **Web version**: `npm start`
   - **Electron version**: `npm run electron-dev`

## Usage

### Getting Started

1. **Create a Project**: Click "New Project" in the left sidebar to create your first project
2. **Select a Model**: Choose from the available models in the dropdown
3. **Configure Your Test**:
   - Edit the system prompt to define the AI's behavior
   - Enter your input text in the user input area
   - Optionally enable structured output if the model supports it
4. **Run the Test**: Click "Run Test" to execute the model
5. **Review Results**: View the response in the main area and compare with previous tests

### Large File Processing (Electron Only)

1. **Upload Files**: Use the File Processor to upload large JSON, CSV, YAML, or XML files
2. **Preview Data**: View a preview of the uploaded data before processing
3. **Create Subsets**: Apply filters to create targeted data subsets for analysis
4. **Process with LLMs**: Use the filtered data as input for your LLM tests

### Project Management

- **Create Projects**: Organize related tests into projects
- **Switch Between Projects**: Click on any project in the sidebar to switch
- **Edit Projects**: Click the edit icon to modify project details
- **Delete Projects**: Remove projects you no longer need
- **Export Projects**: Export project data in various formats

### History and Comparison

- **View History**: All interactions are saved in the project history
- **Compare Responses**: Select two interactions and click "Compare Selected"
- **Delete Interactions**: Remove individual test results from history
- **Metadata Tracking**: Response times, model details, and configuration are preserved

### Structured Output

For models that support structured output:
- Enable the "Request Structured Output" toggle
- Select your preferred format (JSON, XML, YAML, CSV)
- Responses will be formatted and syntax-highlighted

## Architecture

### Web vs Electron Mode

The application can run in two modes:

#### Web Mode (Browser)
- Uses browser localStorage for data persistence
- Limited to smaller files due to browser constraints
- Accessible via web browser at `http://localhost:3000`

#### Electron Mode (Desktop)
- Uses local file system for data storage
- Supports large files up to 100MB
- Native desktop application experience
- Better performance for large data processing

### Data Storage

#### Web Mode
- **Storage**: Browser localStorage
- **Limitations**: 5-10MB storage limit, browser memory constraints
- **Location**: Browser's local storage

#### Electron Mode
- **Storage**: Local file system
- **Location**: `~/Library/Application Support/llm-tester-ui/data/` (macOS)
- **Structure**:
  ```
  data/
  ├── projects/          # Project data and interactions
  ├── uploads/           # Uploaded large files
  └── exports/           # Exported project data
  ```

### File Processing

The Electron version includes advanced file processing capabilities:

- **Streaming Processing**: Large files are processed in chunks to avoid memory issues
- **Multiple Formats**: Support for JSON, CSV, YAML, and XML files
- **Data Preview**: Preview uploaded data before processing
- **Subset Creation**: Create filtered subsets of data for targeted analysis
- **Metadata Tracking**: Track file information, processing times, and data statistics

## Configuration

### Environment Variables

Create a `.env` file in the project root to customize the application:

```bash
# API Configuration
REACT_APP_API_URL=http://localhost:3001
REACT_APP_OLLAMA_URL=http://localhost:11434
```

### Application Configuration

Edit `src/config.ts` to customize the application behavior:

```typescript
export const CONFIG = {
  // Set to true to use real Ollama API, false for mock data
  USE_REAL_OLLAMA: false,
  
  // Ollama API endpoint
  OLLAMA_URL: 'http://localhost:11434',
  
  // Default model settings
  DEFAULT_TEMPERATURE: 0.7,
  DEFAULT_MAX_TOKENS: 4096,
  
  // Available MedGemma models
  MEDGEMMA_MODELS: [
    'medgem-custom:latest',
    'medgemma:2b',
    'medgemma:7b',
    'medgemma:latest'
  ],
  
  // Models that support structured output
  STRUCTURED_OUTPUT_MODELS: [
    'llama3.2',
    'llama3.3',
    'qwen3',
    'mistral-large',
    'medgem-custom',
    'medgemma'
  ]
};
```

### Adding New Models

To add new models, edit the `MOCK_MODELS` array in `src/services/api.ts`:

```typescript
const MOCK_MODELS: LLMModel[] = [
  {
    id: 'your-model-id',
    name: 'Your Model Name',
    provider: 'Your Provider',
    supportsStructuredOutput: true,
    maxTokens: 4096,
    temperature: 0.7
  }
];
```

### Using MedGemma Models

The UI now includes support for MedGemma models:

1. **Available Models**: The UI includes `medgem-custom:latest` and other MedGemma variants
2. **Medical Responses**: MedGemma models provide specialized medical responses
3. **Structured Output**: MedGemma supports JSON structured output for medical assessments
4. **Real Integration**: Set `USE_REAL_OLLAMA: true` in `src/config.ts` to use real Ollama API

To enable real Ollama integration:
```typescript
// In src/config.ts
export const CONFIG = {
  USE_REAL_OLLAMA: true,  // Change this to true
  OLLAMA_URL: 'http://localhost:11434',
  // ... other config
};
```

### Backend Integration

The application includes both mock data and real API integration:

#### Current Implementation
- **Mock Mode** (default): Uses simulated responses for development
- **Real API Mode**: Integrates with actual Ollama API when enabled

#### Ollama API Integration
The application includes a dedicated Ollama API service (`src/services/ollama-api.ts`) that provides:

```typescript
// Example usage
import { OllamaAPIService } from './services/ollama-api';

const ollamaService = new OllamaAPIService('http://localhost:11434');
const models = await ollamaService.getAvailableModels();
const result = await ollamaService.testModel(config);
```

#### Custom Backend Integration
To integrate with your own LLM service:

1. Update the API calls in `src/services/api.ts`
2. Replace mock responses with actual API calls to your LLM service
3. Configure the proxy in `package.json` to point to your backend

Example backend integration:
```typescript
static async testModel(config: TestConfig): Promise<Interaction> {
  const response = await fetch('/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  return await response.json();
}
```

## Project Structure

```
src/
├── components/          # React components
│   ├── ModelSelector.tsx
│   ├── PromptEditor.tsx
│   ├── ResponseViewer.tsx
│   ├── ProjectManager.tsx
│   ├── HistoryViewer.tsx
│   └── FileProcessor.tsx    # New: Large file processing
├── services/           # API and data services
│   ├── api.ts
│   └── ollama-api.ts
├── types/              # TypeScript type definitions
│   └── index.ts
├── App.tsx             # Main application component
├── index.tsx           # Application entry point
└── index.css           # Global styles

public/
├── electron.js         # Main Electron process
├── preload.js          # Electron preload script
└── index.html          # Application entry point
```

## Development

### Available Scripts

- `npm start` - Start development server (web mode)
- `npm run electron-dev` - Start Electron development mode
- `npm run electron` - Start Electron app (production build)
- `npm run build` - Build for production
- `npm run electron-pack` - Package Electron app
- `npm run dist` - Create distributable
- `npm test` - Run tests
- `npm eject` - Eject from Create React App

### Running the Application

#### Web Mode
```bash
npm start
# Open http://localhost:3000 in your browser
```

#### Electron Mode
```bash
npm run electron-dev
# Desktop application will open automatically
```

### Customization

- **Styling**: Modify the theme in `App.tsx` or add custom CSS
- **Components**: Extend or modify components in the `components/` directory
- **API**: Update the API service to integrate with your backend
- **Types**: Add new TypeScript interfaces in `types/index.ts`
- **File Processing**: Extend file processing capabilities in `public/electron.js`

## Troubleshooting

### Common Issues

1. **Models not loading**: Check that your LLM service is running and accessible
2. **Tests failing**: Verify your system prompt and input text are valid
3. **Projects not saving**: 
   - Web mode: Check browser localStorage permissions
   - Electron mode: Check file system permissions
4. **Structured output not working**: Ensure the selected model supports structured output
5. **Large files not processing**: Ensure you're running in Electron mode
6. **Electron app not starting**: Check Node.js version and dependencies

### Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

### Electron Requirements

- macOS 10.11+ (for macOS builds)
- Windows 7+ (for Windows builds)
- Linux (for Linux builds)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the code comments
3. Open an issue on GitHub

---

**Note**: The Electron version provides enhanced capabilities for large file processing and local data storage. For production use with large datasets, the Electron version is recommended. 