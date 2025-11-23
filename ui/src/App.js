import React, { useState } from 'react';
import './App.css';
import MainLayout from './components/Layout/MainLayout';
import WelcomeScreen from './components/WelcomeScreen/WelcomeScreen';
import { WorkflowProvider, useWorkflow } from './context/WorkflowContext';
import { NotificationProvider } from './context/NotificationContext';
import NotificationContainer from './components/Notifications/NotificationContainer';

function AppContent() {
  const { currentApplication, setCurrentApplication, setActiveSidebar } = useWorkflow();

  const generateDockerStyleName = () => {
    const adjectives = [
      'happy', 'sleepy', 'dopey', 'grumpy', 'sneezy', 'bashful', 'jolly',
      'clever', 'brave', 'calm', 'eager', 'fancy', 'gentle', 'kind',
      'lively', 'nice', 'proud', 'silly', 'witty', 'zealous', 'agile',
      'bold', 'cool', 'daring', 'epic', 'friendly', 'gifted', 'humble',
      'intelligent', 'jovial', 'keen', 'lucid', 'merry', 'noble', 'optimistic',
      'peaceful', 'quirky', 'radiant', 'serene', 'trusting', 'upbeat',
      'vibrant', 'wise', 'xenial', 'youthful', 'zesty'
    ];

    const nouns = [
      'albatross', 'bear', 'cat', 'dog', 'elephant', 'fox', 'giraffe',
      'hamster', 'iguana', 'jaguar', 'kangaroo', 'leopard', 'monkey',
      'narwhal', 'octopus', 'penguin', 'quokka', 'rabbit', 'snake',
      'tiger', 'unicorn', 'vulture', 'whale', 'xerus', 'yak', 'zebra',
      'dolphin', 'eagle', 'falcon', 'gorilla', 'hawk', 'impala', 'jackal',
      'koala', 'lion', 'meerkat', 'newt', 'owl', 'panda', 'quail'
    ];

    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];

    return `${adjective}_${noun}`;
  };

  const handleCreateNew = async () => {
    try {
      // Generate Docker-style application name and unique ID
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 9);
      const appId = `app_${timestamp}_${randomId}`;
      const appName = generateDockerStyleName();

      const response = await fetch('http://localhost:5000/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: appId,
          name: appName,
          description: 'Auto-generated application',
          domain: 'general',
          resources: {
            workflows: [],
            forms: [],
            pages: [],
            dataModels: []
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        // Set the new application as current
        setCurrentApplication(data.application);
        // Navigate to workflow editor
        setActiveSidebar('workflow-editor');
      } else {
        alert('Failed to create application');
      }
    } catch (error) {
      console.error('Failed to create application:', error);
      alert('Failed to create application');
    }
  };

  if (!currentApplication) {
    return (
      <>
        <WelcomeScreen
          onCreateNew={handleCreateNew}
          onOpenExisting={() => {
            // Navigate to applications sidebar to show applications list
            setActiveSidebar('applications');
          }}
        />
        <MainLayout />
      </>
    );
  }

  return <MainLayout appName={currentApplication?.name} />;
}

function App() {
  const [currentApp, setCurrentApp] = useState(null);

  return (
    <NotificationProvider>
      <WorkflowProvider currentApp={currentApp}>
        <AppContent />
      </WorkflowProvider>
      <NotificationContainer />
    </NotificationProvider>
  );
}

export default App;
