import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from './DataTable';
import { dataApi } from '../api/client';

// Shadcn UI Components
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Separator } from './ui/separator';
import { Skeleton } from './ui/skeleton';
import { cn } from '../lib/utils';

export default function PageRenderer({ page, forms, workflowContext = {}, onAuthSuccess }) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [submittingForm, setSubmittingForm] = useState(null);
  const navigate = useNavigate();

  // Destructure workflow context for easy access
  const { instance: workflowInstance, currentTask, onFormSubmit: workflowFormSubmit } = workflowContext;

  useEffect(() => {
    if (page) loadPageData();
  }, [page?.id]);

  const loadPageData = async () => {
    setLoading(true);
    try {
      const bindings = findDataBindings(page.sections || []);
      const dataPromises = {};
      for (const binding of bindings) {
        const [model] = binding.split('.');
        if (model && !dataPromises[model]) {
          dataPromises[model] = dataApi.list(model.toLowerCase()).then(res => res.data || []).catch(() => []);
        }
      }
      const results = await Promise.all(Object.entries(dataPromises).map(async ([model, promise]) => [model, await promise]));
      const dataMap = {};
      results.forEach(([model, modelData]) => { dataMap[model] = modelData; });
      setData(dataMap);
    } catch (error) {
      console.error('Error loading page data:', error);
    } finally {
      setLoading(false);
    }
  };

  const findDataBindings = (sections) => {
    const bindings = new Set();
    const traverse = (items) => {
      if (!items) return;
      for (const item of items) {
        if (item.dataBinding) bindings.add(item.dataBinding);
        if (item.components) traverse(item.components);
        if (item.children) traverse(item.children);
      }
    };
    traverse(sections);
    return Array.from(bindings);
  };

  const handleFormChange = (formId, fieldName, value) => {
    setFormData(prev => ({ ...prev, [formId]: { ...prev[formId], [fieldName]: value } }));
    if (formErrors[formId]?.[fieldName]) {
      setFormErrors(prev => ({ ...prev, [formId]: { ...prev[formId], [fieldName]: null } }));
    }
  };

  const handleFormSubmit = async (form) => {
    const formValues = formData[form.id] || {};
    const errors = {};
    (form.fields || []).forEach(field => {
      if (field.required && !formValues[field.name]) errors[field.name] = field.label + ' is required';
    });
    if (Object.keys(errors).length > 0) { setFormErrors(prev => ({ ...prev, [form.id]: errors })); return; }
    setSubmittingForm(form.id);
    try {
      // If workflow context has a form submit handler and we're in a workflow, use it
      if (workflowFormSubmit && (workflowInstance || form.workflowId)) {
        const result = await workflowFormSubmit(form.id, formValues, {
          startWorkflow: !workflowInstance,
          workflowId: form.workflowId || form.formAssociation?.workflowId
        });
        setFormData(prev => ({ ...prev, [form.id]: {} }));
        return;
      }

      // Check if form is linked to a workflow (fallback if no workflow context)
      const workflowId = form.workflowId || form.formAssociation?.workflowId;
      const nodeType = form.linkedNodeType || form.formAssociation?.nodeType;
      const instanceId = form.instanceId || formValues._instanceId || workflowInstance?.id;

      if (workflowId) {
        let response, result;

        if ((nodeType === 'userTask' && instanceId) || (workflowInstance && currentTask)) {
          // Resume existing workflow instance (for human/user task forms)
          const activeInstanceId = instanceId || workflowInstance?.id;
          const taskId = currentTask?.taskId;
          response = await fetch(`/api/instances/${activeInstanceId}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId, ...formValues })
          });
          result = await response.json();
          if (!result.success) throw new Error(result.error || 'Failed to complete task');
          // Navigation is handled by workflow context
        } else {
          // Start new workflow instance (for start node forms)
          response = await fetch(`/api/workflows/${workflowId}/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formValues)
          });
          result = await response.json();
          if (!result.success) throw new Error(result.error || 'Failed to start workflow');
        }
      } else {
        // Fallback: save directly to data model if no workflow
        let model = form.dataModelId || form.dataModelName || form.dataModel;
        if (!model) {
          const nameMatch = (form.name || form.title || '').match(/(?:create|edit|new|update|add)\s+(\w+)/i);
          if (nameMatch) model = nameMatch[1];
        }
        if (!model) {
          const idMatch = (form.id || '').match(/(?:create|edit|new|add)-(\w+)-form/i);
          if (idMatch) model = idMatch[1];
        }
        if (model) {
          await dataApi.create(model.toLowerCase(), formValues);
        }
      }
      setFormData(prev => ({ ...prev, [form.id]: {} }));
      setFormErrors(prev => ({ ...prev, [form.id]: {} }));
      loadPageData();
    } catch (error) {
      alert('Error submitting form: ' + error.message);
    } finally {
      setSubmittingForm(null);
    }
  };

  const handleAction = (action) => {
    if (!action) return;
    if (action.type === 'navigate') navigate(action.target);
  };

  // Render a form field with Shadcn UI components
  const renderFormField = (field, form) => {
    const formValues = formData[form.id] || {};
    const errors = formErrors[form.id] || {};
    const hasError = !!errors[field.name];
    const renderInput = () => {
      switch (field.type) {
        case 'textarea': return <Textarea placeholder={field.placeholder} value={formValues[field.name] || ''} onChange={(e) => handleFormChange(form.id, field.name, e.target.value)} className={cn("min-h-[100px]", hasError && "border-destructive")} />;
        case 'select': case 'dropdown': return <Select value={formValues[field.name] || ''} onValueChange={(value) => handleFormChange(form.id, field.name, value)}><SelectTrigger className={cn(hasError && "border-destructive")}><SelectValue placeholder={field.placeholder || 'Select...'} /></SelectTrigger><SelectContent>{(field.options || []).map((opt, i) => <SelectItem key={i} value={typeof opt === 'object' ? opt.value : opt}>{typeof opt === 'object' ? opt.label : opt}</SelectItem>)}</SelectContent></Select>;
        case 'checkbox': return <div className="flex items-center space-x-2"><Checkbox id={`${form.id}-${field.name}`} checked={formValues[field.name] || false} onCheckedChange={(checked) => handleFormChange(form.id, field.name, checked)} /><Label htmlFor={`${form.id}-${field.name}`} className="cursor-pointer">{field.label}</Label></div>;
        case 'date': return <Input type="date" value={formValues[field.name] || ''} onChange={(e) => handleFormChange(form.id, field.name, e.target.value)} className={cn(hasError && "border-destructive")} />;
        case 'number': return <Input type="number" placeholder={field.placeholder} value={formValues[field.name] || ''} onChange={(e) => handleFormChange(form.id, field.name, e.target.value)} className={cn(hasError && "border-destructive")} />;
        case 'email': return <Input type="email" placeholder={field.placeholder} value={formValues[field.name] || ''} onChange={(e) => handleFormChange(form.id, field.name, e.target.value)} className={cn(hasError && "border-destructive")} />;
        default: return <Input type="text" placeholder={field.placeholder} value={formValues[field.name] || ''} onChange={(e) => handleFormChange(form.id, field.name, e.target.value)} className={cn(hasError && "border-destructive")} />;
      }
    };
    if (field.type === 'checkbox') return <div key={field.id} className="mb-4">{renderInput()}{errors[field.name] && <p className="text-destructive text-sm mt-1">{errors[field.name]}</p>}</div>;
    return <div key={field.id} className="mb-4 space-y-2"><Label>{field.label}{field.required && <span className="text-destructive ml-1">*</span>}</Label>{renderInput()}{errors[field.name] && <p className="text-destructive text-sm">{errors[field.name]}</p>}</div>;
  };

  // Render inline form within a card
  const renderInlineForm = (formId) => {
    const form = forms.find(f => f.id === formId);
    if (!form) return <p className="text-muted-foreground">Form not found</p>;
    const layout = form.layout;
    const renderFields = () => {
      if (layout?.sections && layout.sections.length > 0) {
        return layout.sections.map((section, sIdx) => {
          const sectionFields = section.fieldIds.map(fid => form.fields.find(f => f.id === fid || f.name === fid)).filter(Boolean);
          return <div key={sIdx} className="mb-6">{section.title && <h4 className="text-sm font-semibold mb-4 pb-2 border-b">{section.title}</h4>}<div className={cn("grid gap-4", layout.type === 'two-column' ? 'grid-cols-2' : 'grid-cols-1')}>{sectionFields.map(field => <div key={field.id} className={field.type === 'textarea' ? 'col-span-full' : ''}>{renderFormField(field, form)}</div>)}</div></div>;
        });
      }
      return <div className="grid grid-cols-2 gap-4">{(form.fields || []).map(field => <div key={field.id} className={field.type === 'textarea' ? 'col-span-full' : ''}>{renderFormField(field, form)}</div>)}</div>;
    };
    return <div className="mt-4">{renderFields()}<div className={cn("mt-5 pt-4 border-t flex", form.submitButton?.position === 'right' ? 'justify-end' : 'justify-start')}><Button onClick={() => handleFormSubmit(form)} disabled={submittingForm === form.id}>{submittingForm === form.id ? 'Submitting...' : (form.submitButton?.label || 'Submit')}</Button></div></div>;
  };

  const renderComponent = (component, index) => {
    if (!component) return null;
    const { type, config, formRef, dataBinding, children } = component;
    switch (type) {
      case 'container':
        return <div key={index} className={cn("w-full", config?.maxWidth && "mx-auto")} style={{ maxWidth: config?.maxWidth || '100%', padding: config?.padding || '0' }}>{(config?.children || children || component.components || []).map((c, i) => renderComponent(c, i))}</div>;
      case 'heading':
        const headingClasses = { h1: 'text-3xl font-bold tracking-tight', h2: 'text-2xl font-semibold tracking-tight', h3: 'text-xl font-semibold' };
        const HeadingTag = config?.variant === 'h1' ? 'h1' : config?.variant === 'h2' ? 'h2' : config?.variant === 'h3' ? 'h3' : 'h2';
        return <HeadingTag key={index} className={cn(headingClasses[config?.variant] || headingClasses.h2, "mb-2")}>{config?.text}</HeadingTag>;
      case 'text':
        const textClasses = { h1: 'text-3xl font-bold', h2: 'text-2xl font-semibold', h3: 'text-xl font-semibold', subtitle: 'text-base text-muted-foreground', caption: 'text-xs text-muted-foreground', body: 'text-sm' };
        return <p key={index} className={cn(textClasses[config?.variant] || textClasses.body, "leading-relaxed")}>{config?.text}</p>;
      case 'spacer':
        return <div key={index} style={{ height: config?.height || '16px' }} />;
      case 'divider':
        return <Separator key={index} className="my-4" />;
      case 'stat-card':
        return <Card key={index} className="hover:shadow-lg transition-shadow"><CardContent className="pt-6"><div className="flex justify-between items-start"><div><p className="text-sm font-medium text-muted-foreground">{config?.title}</p><p className="text-3xl font-bold mt-1">{config?.value || '0'}</p>{config?.trend && <span className={cn("text-sm mt-1 inline-block", config?.trendDirection === 'up' ? 'text-green-600' : 'text-red-600')}>{config?.trendDirection === 'up' ? '+' : ''}{config?.trend}</span>}</div>{config?.icon && <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">{config.icon === 'clipboard-list' ? '☐' : config.icon === 'clock' ? '⏱' : config.icon === 'check-circle' ? '✓' : '●'}</div>}</div></CardContent></Card>;
      case 'buttonGroup':
        return <div key={index} className="flex gap-3 flex-wrap">{(config?.buttons || []).map((btn, i) => <Button key={i} variant={btn.variant === 'primary' ? 'default' : btn.variant === 'destructive' ? 'destructive' : 'outline'}>{btn.icon && <span className="mr-2">{btn.icon === 'plus' ? '+' : btn.icon === 'x' ? '×' : btn.icon === 'check' ? '✓' : '●'}</span>}{btn.label}</Button>)}</div>;
      case 'breadcrumb':
        return <nav key={index} className="flex items-center space-x-2 text-sm text-muted-foreground">{(config?.items || []).map((item, i, arr) => <React.Fragment key={i}>{i > 0 && <span>/</span>}<a href={item.route} className={cn("hover:text-foreground transition-colors", i === arr.length - 1 ? 'text-foreground font-medium' : 'text-primary')}>{item.label}</a></React.Fragment>)}</nav>;
      case 'accordion':
        return <Accordion key={index} type="single" collapsible className="w-full">{(config?.items || []).map((item, i) => <AccordionItem key={i} value={`item-${i}`}><AccordionTrigger>{item.title}</AccordionTrigger><AccordionContent>{item.content}</AccordionContent></AccordionItem>)}</Accordion>;
      case 'alert':
        const alertVariant = config?.variant === 'error' || config?.variant === 'destructive' ? 'destructive' : 'default';
        return <Alert key={index} variant={alertVariant}>{config?.title && <AlertTitle>{config.title}</AlertTitle>}<AlertDescription>{config?.message}</AlertDescription></Alert>;
      case 'spinner':
        return <div key={index} className="flex flex-col items-center justify-center py-8"><Skeleton className={cn("rounded-full", config?.size === 'large' ? 'w-12 h-12' : 'w-10 h-10')} />{config?.label && <p className="mt-2 text-muted-foreground">{config.label}</p>}</div>;
      case 'select':
        return <div key={index} className="min-w-[150px] space-y-2">{config?.label && <Label>{config.label}</Label>}<Select><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{(config?.options || []).map((opt, i) => <SelectItem key={i} value={typeof opt === 'string' ? opt : opt.value}>{typeof opt === 'string' ? opt : opt.label}</SelectItem>)}</SelectContent></Select></div>;
      case 'card':
        return <Card key={index} className="hover:shadow-md transition-shadow">{(config?.title || config?.description) && <CardHeader>{config?.title && <CardTitle>{config.title}</CardTitle>}{config?.description && <CardDescription>{config.description}</CardDescription>}</CardHeader>}<CardContent>{formRef && renderInlineForm(formRef)}{(config?.children || component.components || children || []).map((c, i) => renderComponent(c, i))}</CardContent></Card>;
      case 'button':
        const buttonVariant = config?.variant === 'secondary' ? 'secondary' : config?.variant === 'outline' ? 'outline' : config?.variant === 'destructive' ? 'destructive' : config?.variant === 'ghost' ? 'ghost' : 'default';
        return <Button key={index} variant={buttonVariant} onClick={() => handleAction(component.action)}>{config?.icon && <span className="mr-2">{config.icon === 'plus' ? '+' : config.icon === 'check' ? '✓' : '●'}</span>}{config?.text || config?.label}</Button>;
      case 'table':
        const [tableModel] = (dataBinding || '').split('.');
        const tableData = data[tableModel] || [];
        const columns = (config?.columns || []).map(col => ({ name: col.key, label: col.label, type: col.type || 'text' }));
        return <Card key={index}>{config?.title && <CardHeader><CardTitle>{config.title}</CardTitle></CardHeader>}<CardContent><DataTable columns={columns} data={tableData} /></CardContent></Card>;
      case 'metric':
        const [metricModel] = (dataBinding || '').split('.');
        const metricData = data[metricModel] || [];
        const metricValue = config?.aggregation === 'count' ? metricData.length : config?.aggregation === 'sum' ? metricData.reduce((sum, r) => sum + (r[config.field] || 0), 0) : metricData.length;
        return <Card key={index} className="text-center hover:shadow-md transition-shadow"><CardContent className="pt-6"><p className="text-4xl font-bold">{metricValue}</p><p className="text-sm text-muted-foreground mt-1">{config?.label || config?.title}</p></CardContent></Card>;
      case 'badge':
        const badgeVariantMap = { success: 'default', warning: 'secondary', error: 'destructive', info: 'outline', green: 'default', red: 'destructive', blue: 'outline' };
        const badgeVar = badgeVariantMap[config?.color] || badgeVariantMap[config?.variant] || 'default';
        return <Badge key={index} variant={badgeVar}>{config?.text}</Badge>;
      case 'form':
        if (formRef || config?.formId) return <div key={index}>{renderInlineForm(formRef || config?.formId)}</div>;
        return null;
      case 'search':
        return <Input key={index} type="search" placeholder={config?.placeholder || 'Search...'} className="max-w-sm" />;
      case 'filter':
        return <div key={index} className="flex gap-3 flex-wrap">{(config?.filters || []).map((filter, fIdx) => <div key={fIdx} className="min-w-[150px] space-y-2"><Label>{filter.label}</Label><Select><SelectTrigger><SelectValue placeholder="All" /></SelectTrigger><SelectContent><SelectItem value="">All</SelectItem>{(filter.options || []).map((opt, oIdx) => <SelectItem key={oIdx} value={opt.value || opt}>{opt.label || opt}</SelectItem>)}</SelectContent></Select></div>)}</div>;
      case 'chart':
        return <Card key={index} className="min-h-[200px]"><CardContent className="flex items-center justify-center h-full pt-6"><div className="text-center text-muted-foreground">{config?.title && <h4 className="font-semibold mb-2">{config.title}</h4>}<p className="text-sm">Chart: {config?.chartType || 'bar'}</p></div></CardContent></Card>;
      case 'grid':
        const gridColsMap = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' };
        const gridCols = config?.columns || 3;
        return <div key={index} className={cn("grid gap-4", gridColsMap[gridCols] || 'grid-cols-3')}>{(config?.children || component.components || children || []).map((c, i) => renderComponent(c, i))}</div>;
      default:
        const childComponents = config?.children || component.components || children || [];
        if (childComponents.length > 0) return <div key={index}>{childComponents.map((c, i) => renderComponent(c, i))}</div>;
        return null;
    }
  };

  const renderSection = (section, index) => {
    if (!section) return null;
    const sectionClasses = { header: 'mb-8', main: '', 'stats-row': 'mb-6', filters: 'mb-6', sidebar: 'bg-card p-5 rounded-lg border' };
    return <div key={index} className={sectionClasses[section.type] || ''}>{(section.components || []).map((component, i) => renderComponent(component, i))}</div>;
  };

  if (loading) return <div className="flex items-center justify-center min-h-[300px]"><div className="text-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" /><p className="text-muted-foreground">Loading...</p></div></div>;
  if (!page) return <div className="flex flex-col items-center justify-center py-16 text-center"><h3 className="text-xl font-semibold">Page Not Found</h3><p className="text-muted-foreground mt-2">The requested page could not be found.</p></div>;
  const hasStyledHeader = page.sections?.some(s => s.type === 'header' && s.components?.length > 0);
  return <div className="p-6 max-w-7xl mx-auto">{!hasStyledHeader && <div className="mb-8"><h1 className="text-3xl font-bold tracking-tight">{page.title || page.name}</h1>{page.description && <p className="text-muted-foreground mt-2">{page.description}</p>}</div>}<div className="space-y-6">{(page.sections || []).map((section, index) => renderSection(section, index))}</div></div>;
}