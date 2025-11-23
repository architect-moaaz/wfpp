# AI Workflow Designer

A modern, web-based platform enabling business and technical users to create, optimize, and manage workflows using natural language prompts and visual drag-and-drop interfaces.

## Features

- **AI-Powered Workflow Creation**: Describe workflows in natural language and let AI generate the visual workflow
- **Visual Drag & Drop Editor**: Interactive workflow canvas built with React Flow
- **Rule Engine**: Create and manage business rules and validation logic
- **Data Models**: Define data structures and schemas for workflows
- **Dynamic Forms**: Design forms for data collection
- **Workflow Orchestration**: Monitor and manage workflow executions
- **Test & Analytics**: Test workflows and view performance metrics

## Technology Stack

- **Frontend**: React.js 18
- **Workflow Canvas**: React Flow
- **State Management**: Context API
- **Icons**: Lucide React
- **Styling**: CSS3 with custom designs

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd workflowpp
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm start
```

The application will open at [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── components/
│   ├── Layout/           # Main layout components (Header, Sidebar, Properties Panel)
│   ├── Canvas/           # Workflow canvas and custom node components
│   ├── AIPrompt/         # AI prompt interface
│   └── Panels/           # Various feature panels (Rules, Forms, Data Models, etc.)
├── context/              # React Context for state management
├── App.js                # Main application component
└── index.js              # Application entry point
```

## Key Components

### 1. AI Prompt Interface
- Natural language workflow creation
- Interactive conversation with AI assistant
- Suggested prompts for common tasks

### 2. Workflow Editor
- Visual drag-and-drop canvas
- Custom node types (Start Process, Validation, Decision)
- Connection management between nodes
- Properties panel for node configuration

### 3. Rule Engine
- Create validation rules
- Define business logic
- Attach rules to workflow steps

### 4. Forms & Data Models
- Design dynamic forms
- Create data schemas
- Map form fields to data models

### 5. Orchestration
- Monitor workflow executions
- View execution statistics
- Track performance metrics

### 6. Test & Analytics
- Test workflows with sample data
- View execution results
- Performance analytics and insights

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm build` - Builds the app for production
- `npm test` - Runs the test suite
- `npm eject` - Ejects from Create React App (one-way operation)

## Usage

1. **Create a Workflow**:
   - Click "AI Prompt" in the sidebar
   - Describe your workflow in natural language
   - AI generates the workflow diagram

2. **Edit Workflow**:
   - Switch to "Workflow Editor"
   - Drag and drop nodes
   - Connect nodes to define flow
   - Click nodes to edit properties

3. **Add Rules**:
   - Navigate to "Rule Engine"
   - Create validation or decision rules
   - Attach rules to workflow nodes

4. **Test Workflow**:
   - Click "Test Run" tab
   - Enter test data
   - View execution results

5. **Publish**:
   - Review workflow
   - Click "Publish Workflow"
   - Workflow becomes live

## Sample Workflow

The application includes a sample "Customer Onboarding Process" workflow with:
- Start Process (Form Submission)
- Validate Information (Email & Phone validation)
- Decision Point (Credit Check)

## Future Enhancements

- Backend API integration (Node.js/Express)
- LLM integration for AI features (OpenAI GPT-4)
- Database persistence (MongoDB/PostgreSQL)
- Real-time collaboration
- Version control for workflows
- Advanced analytics and reporting
- Plugin system for extensibility

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
