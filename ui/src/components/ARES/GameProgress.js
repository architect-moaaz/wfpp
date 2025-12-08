import React, { useState, useEffect } from 'react';
import './GameProgress.css';

const GameProgress = ({ events, isGenerating }) => {
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('');
  const [currentActivity, setCurrentActivity] = useState('');
  const [phases, setPhases] = useState([
    { id: 'planning', name: 'Planning', status: 'pending', progress: 0 },
    { id: 'design', name: 'Design System', status: 'pending', progress: 0 },
    { id: 'generation', name: 'Component Generation', status: 'pending', progress: 0 },
    { id: 'validation', name: 'Validation', status: 'pending', progress: 0 }
  ]);
  const [stats, setStats] = useState({
    dataModels: 0,
    workflows: 0,
    forms: 0,
    pages: 0,
    totalComponents: 0
  });
  const [hasFailed, setHasFailed] = useState(false);
  const [failureMessage, setFailureMessage] = useState('');

  useEffect(() => {
    if (!events || events.length === 0) {
      resetProgress();
      return;
    }

    const lastEvent = events[events.length - 1];
    processEvent(lastEvent);
  }, [events]);

  const resetProgress = () => {
    setProgress(0);
    setCurrentPhase('');
    setCurrentActivity('');
    setPhases([
      { id: 'planning', name: 'Planning', status: 'pending', progress: 0 },
      { id: 'design', name: 'Design System', status: 'pending', progress: 0 },
      { id: 'generation', name: 'Component Generation', status: 'pending', progress: 0 },
      { id: 'validation', name: 'Validation', status: 'pending', progress: 0 }
    ]);
    setStats({
      dataModels: 0,
      workflows: 0,
      forms: 0,
      pages: 0,
      totalComponents: 0
    });
    setHasFailed(false);
    setFailureMessage('');
  };

  const updatePhase = (phaseId, status, progress = 0) => {
    setPhases(prev => prev.map(phase =>
      phase.id === phaseId
        ? { ...phase, status, progress }
        : phase
    ));
  };

  const processEvent = (event) => {
    if (!event) return;

    // Handle different event types
    if (event.type === 'started') {
      setCurrentActivity('Initializing generation process');
      setCurrentPhase('Planning');
      setProgress(5);
      updatePhase('planning', 'in-progress', 30);
    }

    // Handle top-level component-generating events (from ComponentOrchestrator)
    if (event.type === 'component-generating' && event.data) {
      const { componentType, componentName, progress: genProgress } = event.data;
      setCurrentPhase('Component Generation');
      setCurrentActivity(`Generating ${componentType}: ${componentName}`);
      updatePhase('planning', 'completed', 100);
      updatePhase('design', 'completed', 100);
      updatePhase('generation', 'in-progress', 50);

      if (genProgress) {
        const [current, total] = genProgress.split('/').map(Number);
        const progressValue = 20 + (current / total * 60);
        setProgress(progressValue);
      }
    }

    // Handle top-level component-completed events (from ComponentOrchestrator)
    if (event.type === 'component-completed' && event.data) {
      const { componentType, componentName } = event.data;
      setCurrentActivity(`Completed: ${componentName}`);
      updateStats(componentType);
    }

    if (event.type === 'thinking-step' && event.data) {
      const { agent, step } = event.data;

      // Planning phase
      if (agent === 'PlanningExpert') {
        setCurrentPhase('Planning');
        setCurrentActivity(`Analyzing requirements: ${step}`);
        setProgress(10);
        updatePhase('planning', 'in-progress', 60);

        if (step === 'Component Plan Created') {
          updatePhase('planning', 'completed', 100);
        }
      }

      // Design phase
      if (agent === 'DesignExpert') {
        setCurrentPhase('Design System');
        setCurrentActivity(`Creating design system: ${step}`);
        setProgress(20);
        updatePhase('design', 'in-progress', 50);

        if (step === 'Design System Complete') {
          updatePhase('design', 'completed', 100);
        }
      }

      // Component generation
      if (event.data.type === 'component-generating') {
        const { componentType, componentName, progress: genProgress } = event.data.data;
        setCurrentPhase('Component Generation');
        setCurrentActivity(`Generating ${componentType}: ${componentName}`);
        updatePhase('generation', 'in-progress', 50);

        const progressValue = genProgress ?
          20 + (parseInt(genProgress.split('/')[0]) / parseInt(genProgress.split('/')[1]) * 60) : 20;
        setProgress(progressValue);
      }

      if (event.data.type === 'component-completed') {
        const { componentType, componentName } = event.data.data;
        setCurrentActivity(`Completed: ${componentName}`);
        updateStats(componentType);
      }

      // Routing phase
      if (agent === 'RouterAgent' && step === 'Routing Complete') {
        setCurrentActivity('Expert routing complete');
        setProgress(30);
      }

      // Expert execution
      if (step === 'Executing Workflow Experts' || step === 'Executing Form Experts' ||
          step === 'Executing Data Model Experts' || step === 'Executing Mobile Experts') {
        setCurrentPhase('Component Generation');
        setCurrentActivity(`Processing: ${agent}`);
        setProgress(50);
        updatePhase('generation', 'in-progress', 70);
      }

      // Combination phase
      if (agent === 'ExpertCombiner') {
        setCurrentPhase('Validation');
        setCurrentActivity('Validating and combining components');
        setProgress(85);
        updatePhase('validation', 'in-progress', 50);

        if (step === 'Combination Complete') {
          updatePhase('generation', 'completed', 100);
          updatePhase('validation', 'in-progress', 80);
        }
      }

      // Final phase
      if (agent === 'MoEOrchestrator' && step === 'MoE Complete') {
        setCurrentPhase('Complete');
        setCurrentActivity('Generation complete');
        setProgress(100);
        updatePhase('validation', 'completed', 100);
      }
    }

    if (event.type === 'completed') {
      setCurrentActivity('Application generated successfully');
      setCurrentPhase('Complete');
      setProgress(100);

      // Update all phases to completed
      setPhases(prev => prev.map(phase => ({ ...phase, status: 'completed', progress: 100 })));

      const { stats: eventStats } = event;
      if (eventStats) {
        setStats({
          dataModels: eventStats.dataModelsAdded || 0,
          workflows: eventStats.workflowsAdded || 0,
          forms: eventStats.formsAdded || 0,
          pages: eventStats.pagesAdded || 0,
          totalComponents: (eventStats.dataModelsAdded || 0) +
                          (eventStats.workflowsAdded || 0) +
                          (eventStats.formsAdded || 0) +
                          (eventStats.pagesAdded || 0)
        });
      }
    }

    // Handle error/failure events
    if (event.type === 'error' || event.type === 'failed') {
      setHasFailed(true);
      setFailureMessage(event.message || event.error || 'Generation process failed');
      setCurrentPhase('Failed');
      setCurrentActivity('Generation failed');

      // Find the current in-progress phase and mark it as failed
      // Gray out (mark as completed-grayed) all previously completed phases
      setPhases(prev => prev.map(phase => {
        if (phase.status === 'in-progress') {
          return { ...phase, status: 'failed', progress: phase.progress };
        } else if (phase.status === 'completed') {
          return { ...phase, status: 'completed-grayed' };
        }
        return phase;
      }));
    }
  };

  const updateStats = (componentType) => {
    setStats(prev => {
      const key = componentType === 'dataModel' ? 'dataModels' :
                  componentType === 'workflow' ? 'workflows' :
                  componentType === 'form' ? 'forms' :
                  componentType === 'page' ? 'pages' : null;

      if (!key) return prev;

      return {
        ...prev,
        [key]: prev[key] + 1,
        totalComponents: prev.totalComponents + 1
      };
    });
  };

  // Only show progress when generation actually starts
  // Check if we have any actual generation events (not just conversation)
  const hasGenerationEvents = events && events.some(event =>
    event.type === 'started' ||
    event.type === 'thinking-step' ||
    event.type === 'component-generating' ||
    event.type === 'component-completed' ||
    event.type === 'component-error' ||
    event.type === 'completed' ||
    event.type === 'error' ||
    event.type === 'failed'
  );

  if (!hasGenerationEvents) {
    return null;
  }

  return (
    <div className="progress-container">
      {/* Current Activity Header */}
      <div className="progress-header">
        <div className="progress-title">{hasFailed ? 'Generation Failed' : 'Generation in Progress'}</div>
        <div className={`progress-status ${hasFailed ? 'status-failed' : ''}`}>{currentPhase}</div>
      </div>

      {/* Main Progress Bar */}
      <div className="progress-bar-section">
        <div className="progress-label">{currentActivity}</div>
        <div className="progress-bar-track">
          <div className={`progress-bar-fill ${hasFailed ? 'progress-bar-failed' : ''}`} style={{ width: `${progress}%` }}>
            <span className="progress-percentage">{progress}%</span>
          </div>
        </div>
      </div>

      {/* Phase Timeline */}
      <div className="phase-timeline">
        {phases.map((phase, index) => (
          <div key={phase.id} className={`phase-item ${phase.status}`}>
            <div className="phase-indicator">
              <div className="phase-dot">
                {(phase.status === 'completed' || phase.status === 'completed-grayed') && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                {phase.status === 'in-progress' && (
                  <div className="phase-spinner"></div>
                )}
                {phase.status === 'failed' && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M3 3L9 9M9 3L3 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              {index < phases.length - 1 && <div className="phase-connector"></div>}
            </div>
            <div className="phase-content">
              <div className="phase-name">{phase.name}</div>
              {phase.status === 'in-progress' && phase.progress > 0 && (
                <div className="phase-progress-mini">
                  <div className="phase-progress-bar" style={{ width: `${phase.progress}%` }}></div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Component Stats */}
      <div className="stats-section">
        <div className="stats-title">Components Generated</div>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-label">Data Models</div>
            <div className="stat-value">{stats.dataModels}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Workflows</div>
            <div className="stat-value">{stats.workflows}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Forms</div>
            <div className="stat-value">{stats.forms}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Pages</div>
            <div className="stat-value">{stats.pages}</div>
          </div>
        </div>
      </div>

      {/* Completion/Failure Message */}
      {hasFailed && (
        <div className="failure-message">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" stroke="#EF4444" strokeWidth="2"/>
            <path d="M7 7L13 13M13 7L7 13" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>{failureMessage}</span>
        </div>
      )}
      {!hasFailed && progress === 100 && (
        <div className="completion-message">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" stroke="#10B981" strokeWidth="2"/>
            <path d="M6 10L9 13L14 7" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Application generated successfully with {stats.totalComponents} components</span>
        </div>
      )}
    </div>
  );
};

export default GameProgress;
