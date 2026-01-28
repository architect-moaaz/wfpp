import React from 'react';
import './MainLayout.css';
import Header from './Header';
import Sidebar from './Sidebar';
import WorkflowCanvas from '../Canvas/WorkflowCanvas';
import PropertiesPanel from './PropertiesPanel';
import AIPromptPanel from '../AIPrompt/AIPromptPanel';
import RuleEnginePanel from '../Panels/RuleEnginePanel';
import OrchestrationPanel from '../Panels/OrchestrationPanel';
import MobileScreensPanel from '../Panels/MobileScreensPanel';
import FormsPanel from '../Panels/FormsPanel';
import DataModelsPanel from '../Panels/DataModelsPanel';
import PagesPanel from '../Panels/PagesPanel';
import TestRunPanel from '../Panels/TestRunPanel';
import AnalyticsPanel from '../Panels/AnalyticsPanel';
import VersionHistoryPanel from '../Panels/VersionHistoryPanel';
import WorkflowsPanel from '../Panels/WorkflowsPanel';
import ApplicationsList from '../Applications/ApplicationsList';
import ApplicationsDashboard from '../Applications/ApplicationsDashboard';
import { Analytics } from '../Analytics';
import {
  OrganizationSettings,
  OrgChartCanvas,
  RolesTab,
  GroupsTab,
  DepartmentsTab
} from '../Identity';
import { useWorkflow } from '../../context/WorkflowContext';
import { useAres } from '../../context/AresContext';

const MainLayout = () => {
  const {
    propertiesPanelOpen,
    activeTab,
    activeSidebar,
    currentWorkflow,
    setCurrentWorkflow,
    currentApplication,
    setConnectedForms,
    setDataModels,
    setConnectedPages
  } = useWorkflow();

  const { isOpen, open, close } = useAres();

  const handleVersionRestore = (version) => {
    // Update the workflow with the restored version
    setCurrentWorkflow(version.workflow);
    // You can add a toast notification here if you have one
    console.log(`Restored to version ${version.version}`);
  };

  const handleAIWorkflowGenerated = async (workflow) => {
    console.log('AI Workflow Generated:', workflow);

    // Set the workflow
    setCurrentWorkflow(workflow);

    // Save the workflow itself to the application
    if (currentApplication && currentApplication.id && workflow.id) {
      console.log(`Persisting workflow ${workflow.id} to application ${currentApplication.id}`);
      try {
        await fetch(`http://localhost:5000/api/applications/${currentApplication.id}/workflows`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(workflow)
        });
        console.log('Workflow persisted to application successfully');
      } catch (error) {
        console.error('Failed to persist workflow to application:', error);
      }
    }

    // Extract and set forms, data models, and pages from the generated workflow
    if (workflow.forms && workflow.forms.length > 0) {
      console.log(`Setting ${workflow.forms.length} forms from generated workflow`);
      setConnectedForms(workflow.forms);

      // If there's a current application, persist the forms to it
      if (currentApplication && currentApplication.id) {
        console.log(`Persisting ${workflow.forms.length} forms to application ${currentApplication.id}`);
        try {
          // Add each form to the application
          for (const form of workflow.forms) {
            await fetch(`http://localhost:5000/api/applications/${currentApplication.id}/forms`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(form)
            });
          }
          console.log('Forms persisted to application successfully');
        } catch (error) {
          console.error('Failed to persist forms to application:', error);
        }
      } else {
        console.warn('No current application - forms are only in memory and will be lost on refresh');
      }
    }

    if (workflow.dataModels && workflow.dataModels.length > 0) {
      console.log(`Setting ${workflow.dataModels.length} data models from generated workflow`);
      setDataModels(workflow.dataModels);

      // If there's a current application, persist the data models to it
      if (currentApplication && currentApplication.id) {
        console.log(`Persisting ${workflow.dataModels.length} data models to application ${currentApplication.id}`);
        try {
          // Add each data model to the application
          for (const model of workflow.dataModels) {
            await fetch(`http://localhost:5000/api/applications/${currentApplication.id}/models`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(model)
            });
          }
          console.log('Data models persisted to application successfully');
        } catch (error) {
          console.error('Failed to persist data models to application:', error);
        }
      }
    }

    if (workflow.pages && workflow.pages.length > 0) {
      console.log(`Setting ${workflow.pages.length} pages from generated workflow`);
      setConnectedPages(workflow.pages);

      // If there's a current application, persist the pages to it
      if (currentApplication && currentApplication.id) {
        console.log(`Persisting ${workflow.pages.length} pages to application ${currentApplication.id}`);
        try {
          // Add each page to the application
          for (const page of workflow.pages) {
            await fetch(`http://localhost:5000/api/applications/${currentApplication.id}/pages`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(page)
            });
          }
          console.log('Pages persisted to application successfully');
        } catch (error) {
          console.error('Failed to persist pages to application:', error);
        }
      }
    }

    if (workflow.mobileUI) {
      console.log('Setting mobile UI from generated workflow');
      // Mobile UI will be displayed in the Mobile Screens panel
      // You can add state management for mobile UI if needed

      // If there's a current application, persist the mobile UI to it
      if (currentApplication && currentApplication.id) {
        console.log(`Persisting mobile UI to application ${currentApplication.id}`);
        try {
          await fetch(`http://localhost:5000/api/applications/${currentApplication.id}/mobile-ui`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(workflow.mobileUI)
          });
          console.log('Mobile UI persisted to application successfully');
        } catch (error) {
          console.error('Failed to persist mobile UI to application:', error);
        }
      }
    }

    if (workflow.rules && workflow.rules.length > 0) {
      console.log(`Setting ${workflow.rules.length} rules from generated workflow`);

      // If there's a current application, persist the rules to it
      if (currentApplication && currentApplication.id) {
        console.log(`Persisting ${workflow.rules.length} rules to application ${currentApplication.id}`);
        try {
          // Add each rule to the application
          for (const rule of workflow.rules) {
            await fetch(`http://localhost:5000/api/applications/${currentApplication.id}/rules`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(rule)
            });
          }
          console.log('Rules persisted to application successfully');
        } catch (error) {
          console.error('Failed to persist rules to application:', error);
        }
      }
    }
  };

  const renderSidebarContent = () => {
    switch (activeSidebar) {
      case 'applications':
        return <ApplicationsDashboard />;
      case 'ai-prompt':
        return <AIPromptPanel />;
      case 'workflow-editor':
        return <WorkflowCanvas />;
      case 'workflows':
        return <WorkflowsPanel />;
      case 'forms':
        return <FormsPanel />;
      case 'data-models':
        return <DataModelsPanel />;
      case 'pages':
        return <PagesPanel />;
      case 'rule-engine':
        return <RuleEnginePanel />;
      case 'orchestration':
        return <OrchestrationPanel />;
      case 'mobile-screens':
        return <MobileScreensPanel />;
      case 'version-history':
        return (
          <VersionHistoryPanel
            workflowId={currentWorkflow?.id}
            onVersionRestore={handleVersionRestore}
          />
        );
      case 'org-settings':
        return <OrganizationSettings initialTab="general" />;
      case 'org-chart':
        return <OrgChartCanvas />;
      case 'org-roles':
        return <OrganizationSettings initialTab="roles" />;
      case 'org-groups':
        return <OrganizationSettings initialTab="groups" />;
      case 'org-departments':
        return <OrganizationSettings initialTab="departments" />;
      case 'analytics':
        return <Analytics />;
      default:
        return <WorkflowCanvas />;
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'designer':
        return renderSidebarContent();
      case 'test-run':
        return <TestRunPanel />;
      case 'analytics':
        return <AnalyticsPanel />;
      default:
        return renderSidebarContent();
    }
  };

  return (
    <div className="main-layout">
      <Header />
      <div className="layout-body">
        <Sidebar />
        <div className="main-content">
          {renderTabContent()}
        </div>
        {propertiesPanelOpen && activeSidebar === 'workflow-editor' && <PropertiesPanel />}
      </div>
    </div>
  );
};

export default MainLayout;
