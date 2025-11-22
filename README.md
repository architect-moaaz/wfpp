# Workflow++ - AI Workflow Designer

An AI-powered workflow designer application for creating and managing BPMN-compatible workflows.

## Project Structure

```
workflowpp/
├── ui/                  # React frontend application
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/             # Node.js/Express API server
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── utils/
│   │   └── server.js
│   └── package.json
└── README.md
```

## Features

### Frontend (UI)
- **Visual drag-and-drop workflow editor** - Build workflows by dragging components onto canvas
- **AI-powered workflow generation** - Conversational AI assistant that generates workflows from natural language
  - Claude Code-like interface with thinking process display
  - Real-time workflow generation
  - Interactive chat with AI assistant
  - Auto-apply workflows to canvas
- **BPMN-compatible components** - Industry-standard workflow components
- **Real-time workflow editing** - Edit node properties on the fly
- **Properties panel** - Configure each node with specific properties
- **Export workflows** - Download as JSON for later use

### Backend (API)
- **AI Workflow Generation** - Claude 3.5 Sonnet + RAG system
  - **Real LLM integration** with Anthropic Claude API
  - Natural language to workflow conversion
  - Thinking process transparency with real-time streaming
  - Component recommendations from knowledge base
  - **Automatic fallback** to rule-based generation if no API key
- **WebSocket** real-time communication
- **RESTful API** for workflow management
- **BPMN 2.0 XML conversion** - Convert workflows to BPMN XML
- **Workflow import/export** functionality
- **In-memory storage** (database-ready)

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Running the Frontend

```bash
cd ui
npm install
npm start
```

The React app will start on `http://localhost:3000`

### Running the Backend

```bash
cd backend
npm install
cp .env.example .env
# Optional: Add your Anthropic API key to .env for real LLM-powered generation
# ANTHROPIC_API_KEY=sk-ant-your-key-here
npm run dev
```

The API server will start on `http://localhost:5000`

**Claude AI Integration (Optional):**
- Get API key from [Anthropic Console](https://console.anthropic.com/)
- Add to `.env`: `ANTHROPIC_API_KEY=sk-ant-your-key-here`
- Without API key: Uses rule-based generation
- With API key: Uses Claude 3.5 Sonnet for intelligent workflow generation

## Technology Stack

### Frontend
- React.js 18.2.0
- React Flow 11.10.4
- Lucide React (icons)
- Context API (state management)

### Backend
- Node.js
- Express.js
- CORS
- UUID

## Documentation

- [Frontend Documentation](./ui/README.md)
- [Backend API Documentation](./backend/README.md)

## Development Workflow

1. Start the backend server first
2. Start the frontend development server
3. The frontend will proxy API requests to the backend

## Available Node Types

- **Events**: Start Event, End Event, Timer Event
- **Tasks**: Human Task, Script Task
- **Gateways**: Decision Gateway (Exclusive/Parallel)
- **Others**: Validation, Notification, Data Process

## AI Assistant

The AI Workflow Assistant uses a RAG (Retrieval Augmented Generation) system with a comprehensive knowledge base of workflow components. Simply describe what you want in natural language:

### Example Prompts
- "Build an expense approval workflow"
- "Create a customer onboarding process with email validation and approval"
- "Design an automated data processing workflow with notifications"
- "Build a multi-approval workflow for large purchases"

### How It Works
1. **Analyzes** your requirements
2. **Searches** the knowledge base for relevant components
3. **Shows thinking process** - see how the AI plans your workflow
4. **Generates** the complete workflow
5. **Auto-applies** to canvas - workflow appears instantly

## API Endpoints

### Workflow Management
- `POST /api/workflows` - Create workflow
- `GET /api/workflows` - Get all workflows
- `GET /api/workflows/:id` - Get workflow by ID
- `PUT /api/workflows/:id` - Update workflow
- `DELETE /api/workflows/:id` - Delete workflow

### AI Generation
- `POST /api/ai/generate-workflow` - Generate workflow from natural language
- `GET /api/ai/components` - Get available workflow components
- `GET /api/ai/patterns` - Get workflow patterns

### Export/Convert
- `POST /api/workflows/:id/export` - Export workflow as JSON
- `POST /api/workflows/import` - Import workflow
- `POST /api/workflows/:id/convert-to-bpmn` - Convert to BPMN XML

See [Backend API Documentation](./backend/README.md) for complete API reference.

## License

MIT
