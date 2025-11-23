import React, { useState } from 'react';
import './PanelStyles.css';
import PagesList from '../Pages/PagesList';
import PageBuilderPro from '../PageDesigner/PageBuilderPro';
import PageFlowCanvas from '../PageFlow/PageFlowCanvas';

const PagesPanel = () => {
  const [currentView, setCurrentView] = useState('list'); // 'list', 'designer', or 'flow'
  const [selectedPageId, setSelectedPageId] = useState(null);

  const handleDesignPage = (pageId) => {
    setSelectedPageId(pageId);
    setCurrentView('designer');
  };

  const handleViewFlow = () => {
    setCurrentView('flow');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedPageId(null);
  };

  if (currentView === 'designer' && selectedPageId) {
    return <PageBuilderPro pageId={selectedPageId} onBack={handleBackToList} />;
  }

  if (currentView === 'flow') {
    return <PageFlowCanvas onBack={handleBackToList} />;
  }

  return <PagesList onDesignPage={handleDesignPage} onViewFlow={handleViewFlow} />;
};

export default PagesPanel;
