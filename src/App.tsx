import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  ClipboardCheck, 
  ShieldCheck, 
  Search, 
  History,
  Trash2,
  FileText,
  Zap,
  Loader2,
  Check,
  X,
  Plus,
  Minus,
  Download,
  Save,
  FolderOpen,
  Filter,
  Play,
  Calendar,
  Clock,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface RepeatingField {
  name: string;
  count: number;
}

interface ValidationItem {
  id: string;
  timestamp: string;
  client: string;
  servidor: string;
  status: 'valid' | 'invalid';
  rows: AutoValidationRow[];
  notes?: string;
}

interface AutoValidationRow {
  campo: string;
  backoffice: string;
  pdf: string;
  status: 'match' | 'mismatch' | 'pending';
}

interface ValidationSession {
  id: string;
  name: string;
  rows: AutoValidationRow[];
  notes: string;
}

const QuantitySelector = ({ 
  value, 
  onChange, 
  label = "Quantidade" 
}: { 
  value: number; 
  onChange: (val: number) => void; 
  label?: string 
}) => {
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      onChange(value + 1);
    } else {
      onChange(Math.max(1, value - 1));
    }
  };

  return (
    <div className="relative mt-3">
      <div className="absolute -top-2 left-3 px-1 bg-[#0A0A0A] z-10">
        <span className="text-[10px] font-sans font-bold text-zinc-500 uppercase tracking-wider">
          {label} <span className="text-red-500">*</span>
        </span>
      </div>
      <div 
        className="flex items-center border border-zinc-800 rounded-lg bg-zinc-900/30 overflow-hidden h-12"
        onWheel={handleWheel}
      >
        <button 
          onClick={() => onChange(Math.max(1, value - 1))}
          className="h-full px-4 text-zinc-500 hover:text-white hover:bg-zinc-800/50 transition-all border-r border-zinc-800"
          title="Diminuir"
        >
          <Minus size={18} />
        </button>
        <input 
          type="number"
          value={value}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val) && val >= 0) {
              onChange(val);
            } else if (e.target.value === '') {
              onChange(0);
            }
          }}
          onBlur={() => {
            if (value < 1) onChange(1);
          }}
          className="w-full bg-transparent text-center text-base font-mono font-bold text-white focus:outline-none p-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button 
          onClick={() => onChange(value + 1)}
          className="h-full px-4 text-zinc-500 hover:text-white hover:bg-zinc-800/50 transition-all border-l border-zinc-800"
          title="Aumentar"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
};

export default function App() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [licenseCount, setLicenseCount] = useState<number | ''>(1);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<ValidationItem | null>(null);
  const [baseFields, setBaseFields] = useState<string[]>([
    'Data do Pedido',
    'Client Final',
    'CNPJ',
    'E-mail'
  ]);
  const [repeatingFields, setRepeatingFields] = useState<RepeatingField[]>([
    { name: 'Nome do Item', count: 1 },
    { name: 'Nome do Servidor', count: 1 },
    { name: 'Activation Key', count: 1 }
  ]);
  const [newFieldName, setNewFieldName] = useState('');
  const [newRepeatingFieldName, setNewRepeatingFieldName] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  
  const [sessions, setSessions] = useState<ValidationSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [history, setHistory] = useState<ValidationItem[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'valid' | 'invalid'>('all');
  const [showGuide, setShowGuide] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Advanced Filters State
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  
  // Automation State
  const [isAutomating, setIsAutomating] = useState(false);
  const [automationMessage, setAutomationMessage] = useState('');
  const [quantidade, setQuantidade] = useState<number>(1);
  
  const generateInitialRows = (customBaseFields: string[], customRepeatingFields: RepeatingField[]): AutoValidationRow[] => {
    const baseRows: AutoValidationRow[] = customBaseFields.map(field => ({
      campo: field,
      backoffice: '',
      pdf: '',
      status: 'pending'
    }));

    const repeatingRows: AutoValidationRow[] = [];
    customRepeatingFields.forEach(fieldObj => {
      for (let i = 1; i <= fieldObj.count; i++) {
        repeatingRows.push({
          campo: fieldObj.count > 1 ? `${fieldObj.name} #${i}` : fieldObj.name,
          backoffice: '',
          pdf: '',
          status: 'pending'
        });
      }
    });

    return [...baseRows, ...repeatingRows];
  };

  const createNewSession = (customBaseFields = baseFields, customRepeatingFields = repeatingFields) => {
    const newSession: ValidationSession = {
      id: crypto.randomUUID(),
      name: `Validação ${sessions.length + 1}`,
      rows: generateInitialRows(customBaseFields, customRepeatingFields),
      notes: ''
    };
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newSession.id);
  };

  const removeSession = (id: string) => {
    if (sessions.length <= 1) return;
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (activeSessionId === id) {
        setActiveSessionId(filtered[0].id);
      }
      return filtered;
    });
  };

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  const updateActiveSession = (update: Partial<ValidationSession>) => {
    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, ...update } : s));
  };

  const filteredHistory = history.filter(item => {
    const searchLower = historySearch.toLowerCase();
    const matchesSearch = (item.client?.toLowerCase() || "").includes(searchLower) || 
                          (item.servidor?.toLowerCase() || "").includes(searchLower);
    
    // Status Filter
    const matchesStatus = historyFilter === 'all' || item.status === historyFilter;

    // Client Multi-select Filter
    const matchesClients = selectedClients.length === 0 || selectedClients.includes(item.client);

    // Date/Time Filter
    let matchesDate = true;
    if (startDate || endDate || startTime || endTime) {
      // Helper to parse DD/MM/YYYY, HH:mm:ss to a Date object
      const parseTimestamp = (ts: string) => {
        const [datePart, timePart] = ts.split(', ');
        const [day, month, year] = datePart.split('/').map(Number);
        const [hours, minutes, seconds] = timePart.split(':').map(Number);
        return new Date(year, month - 1, day, hours, minutes, seconds);
      };

      const itemDate = parseTimestamp(item.timestamp);

      if (startDate) {
        const start = new Date(startDate);
        if (startTime) {
          const [h, m] = startTime.split(':').map(Number);
          start.setHours(h, m, 0, 0);
        } else {
          start.setHours(0, 0, 0, 0);
        }
        if (itemDate < start) matchesDate = false;
      }

      if (endDate) {
        const end = new Date(endDate);
        if (endTime) {
          const [h, m] = endTime.split(':').map(Number);
          end.setHours(h, m, 59, 999);
        } else {
          end.setHours(23, 59, 59, 999);
        }
        if (itemDate > end) matchesDate = false;
      }
    }

    return matchesSearch && matchesStatus && matchesClients && matchesDate;
  });

  const uniqueClients = Array.from(new Set(history.map(h => h.client))).filter(Boolean).sort();

  const startAutomation = async () => {
    setIsAutomating(true);
    setAutomationMessage(`Iniciando robô para ${quantidade} pedido(s)...`);
    try {
      const res = await fetch('/api/automation/start', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ quantidade: quantidade }) 
      });
      const data = await res.json();
      if (data.success) {
        setAutomationMessage(data.message);
        setTimeout(() => setAutomationMessage(''), 3000);
      }
    } catch (error) {
      setAutomationMessage('Erro ao iniciar automação.');
      setTimeout(() => setAutomationMessage(''), 3000);
    } finally {
      setIsAutomating(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load Config
        const configRes = await fetch('/api/config');
        const configData = await configRes.json();
        
        let initialBase = baseFields;
        let initialRepeating = repeatingFields;

        if (configData) {
          setBaseFields(configData.baseFields);
          setRepeatingFields(configData.repeatingFields);
          setLicenseCount(configData.licenseCount);
          initialBase = configData.baseFields;
          initialRepeating = configData.repeatingFields;
        }

        const initialSession: ValidationSession = {
          id: crypto.randomUUID(),
          name: 'Validação 1',
          rows: generateInitialRows(initialBase, initialRepeating),
          notes: ''
        };
        setSessions([initialSession]);
        setActiveSessionId(initialSession.id);

        // Load History
        const historyRes = await fetch('/api/history');
        const historyData = await historyRes.json();
        setHistory(historyData);

        // Load Templates
        const templatesRes = await fetch('/api/templates');
        const templatesData = await templatesRes.json();
        setTemplates(templatesData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Save config whenever it changes
  useEffect(() => {
    if (!isLoading) {
      fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseFields, repeatingFields, licenseCount })
      });
    }
  }, [baseFields, repeatingFields, licenseCount, isLoading]);

  const handleLicenseCountChange = (count: number | '') => {
    setLicenseCount(count);
    // When global count changes, we update all repeating fields to this count for convenience
    const updatedRepeating = repeatingFields.map(f => ({ ...f, count: count === '' ? 1 : count }));
    setRepeatingFields(updatedRepeating);
    setSessions(prev => prev.map(s => ({
      ...s,
      rows: generateInitialRows(baseFields, updatedRepeating)
    })));
  };

  const saveTemplate = async () => {
    if (!templateName.trim()) return;
    setIsSavingTemplate(true);
    try {
      const newTemplate = {
        id: crypto.randomUUID(),
        name: templateName.trim(),
        baseFields,
        repeatingFields
      };
      await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate)
      });
      setTemplates(prev => {
        const filtered = prev.filter(t => t.name !== newTemplate.name);
        return [...filtered, newTemplate].sort((a, b) => a.name.localeCompare(b.name));
      });
      setTemplateName('');
    } catch (error) {
      console.error('Failed to save template:', error);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const loadTemplate = (template: any) => {
    setBaseFields(template.baseFields);
    setRepeatingFields(template.repeatingFields);
    setSessions(prev => prev.map(s => ({
      ...s,
      rows: generateInitialRows(template.baseFields, template.repeatingFields)
    })));
  };

  const deleteTemplate = async (id: string) => {
    try {
      await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const addBaseField = () => {
    if (newFieldName.trim() && !baseFields.includes(newFieldName.trim())) {
      const updatedFields = [...baseFields, newFieldName.trim()];
      setBaseFields(updatedFields);
      setNewFieldName('');
      setSessions(prev => prev.map(s => ({
        ...s,
        rows: generateInitialRows(updatedFields, repeatingFields)
      })));
    }
  };

  const removeBaseField = (fieldToRemove: string) => {
    const updatedFields = baseFields.filter(f => f !== fieldToRemove);
    setBaseFields(updatedFields);
    setSessions(prev => prev.map(s => ({
      ...s,
      rows: generateInitialRows(updatedFields, repeatingFields)
    })));
  };

  const updateBaseField = (index: number, newValue: string) => {
    const updatedFields = [...baseFields];
    updatedFields[index] = newValue;
    setBaseFields(updatedFields);
    setSessions(prev => prev.map(s => ({
      ...s,
      rows: generateInitialRows(updatedFields, repeatingFields)
    })));
  };

  const addRepeatingField = () => {
    if (newRepeatingFieldName.trim() && !repeatingFields.find(f => f.name === newRepeatingFieldName.trim())) {
      const updatedFields = [...repeatingFields, { name: newRepeatingFieldName.trim(), count: 1 }];
      setRepeatingFields(updatedFields);
      setNewRepeatingFieldName('');
      setSessions(prev => prev.map(s => ({
        ...s,
        rows: generateInitialRows(baseFields, updatedFields)
      })));
    }
  };

  const removeRepeatingField = (fieldToRemove: string) => {
    const updatedFields = repeatingFields.filter(f => f.name !== fieldToRemove);
    setRepeatingFields(updatedFields);
    setSessions(prev => prev.map(s => ({
      ...s,
      rows: generateInitialRows(baseFields, updatedFields)
    })));
  };

  const updateRepeatingField = (index: number, newValue: string) => {
    const updatedFields = [...repeatingFields];
    updatedFields[index].name = newValue;
    setRepeatingFields(updatedFields);
    setSessions(prev => prev.map(s => ({
      ...s,
      rows: generateInitialRows(baseFields, updatedFields)
    })));
  };

  const updateRepeatingFieldCount = (index: number, newCount: number) => {
    const updatedFields = [...repeatingFields];
    updatedFields[index].count = newCount;
    setRepeatingFields(updatedFields);
    setSessions(prev => prev.map(s => ({
      ...s,
      rows: generateInitialRows(baseFields, updatedFields)
    })));
  };

  const updateRow = (idx: number, field: 'backoffice' | 'pdf', value: string) => {
    const newRows = [...activeSession.rows];
    newRows[idx][field] = value;
    
    const row = newRows[idx];
    if (row.backoffice.trim() === '' || row.pdf.trim() === '') {
      row.status = 'pending';
    } else if (row.backoffice.trim() === row.pdf.trim()) {
      row.status = 'match';
    } else {
      row.status = 'mismatch';
    }
    
    updateActiveSession({ rows: newRows });
  };

  const saveToHistory = async (sessionToSave = activeSession) => {
    const clientRow = sessionToSave.rows.find(r => 
      r.campo.toLowerCase().includes('client') || 
      r.campo.toLowerCase().includes('cliente')
    );
    const serverRow = sessionToSave.rows.find(r => 
      r.campo.toLowerCase().includes('servidor') || 
      r.campo.toLowerCase().includes('host')
    );

    const newItem: ValidationItem = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleString(),
      client: clientRow?.pdf || sessionToSave.rows[0]?.pdf || 'Não informado',
      servidor: serverRow?.pdf || sessionToSave.rows[1]?.pdf || 'Não informado',
      status: sessionToSave.rows.every(r => r.status === 'match') ? 'valid' : 'invalid',
      rows: JSON.parse(JSON.stringify(sessionToSave.rows)),
      notes: sessionToSave.notes
    };

    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      setHistory(prev => [newItem, ...prev]);
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  };

  const saveAllToHistory = async () => {
    for (const session of sessions) {
      await saveToHistory(session);
    }
  };

  const clearHistory = async () => {
    try {
      await fetch('/api/history', { method: 'DELETE' });
      setHistory([]);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  if (isLoading || !activeSession) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest">Carregando Protocolo...</p>
        </div>
      </div>
    );
  }

  const allMatched = activeSession.rows.every(r => r.status === 'match');
  const anyMismatch = activeSession.rows.some(r => r.status === 'mismatch');
  const allFilled = activeSession.rows.every(r => r.backoffice.trim() !== '' && r.pdf.trim() !== '');

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Intelbras Green
    const primaryColor: [number, number, number] = [0, 168, 89];
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('INTELBRAS', 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');
    doc.text('Defense IA - Relatório de Validação', 14, 28);
    
    // Line
    doc.setDrawColor(200);
    doc.line(14, 32, 196, 32);
    
    // Info
    doc.setFontSize(10);
    doc.setTextColor(50);
    doc.text(`Data/Hora: ${new Date().toLocaleString()}`, 14, 40);
    doc.text(`Status Final: ${allMatched ? 'CONFORME' : 'NÃO CONFORME'}`, 14, 46);
    
    // Table
    const tableData = activeSession.rows.map(row => [
      row.campo,
      row.backoffice,
      row.pdf,
      row.status === 'match' ? 'Conforme' : (row.status === 'mismatch' ? 'Divergente' : 'Pendente')
    ]);

    autoTable(doc, {
      startY: 55,
      head: [['Campo', 'Dados Backoffice', 'Dados PDF', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      styles: { font: 'helvetica', fontSize: 9 },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 3) {
          if (data.cell.raw === 'Conforme') {
            data.cell.styles.textColor = [0, 168, 89];
            data.cell.styles.fontStyle = 'bold';
          } else if (data.cell.raw === 'Divergente') {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    // Notes section
    if (activeSession.notes.trim()) {
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(10);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text('OBSERVAÇÕES:', 14, finalY);
      
      doc.setFontSize(9);
      doc.setTextColor(80);
      doc.setFont('helvetica', 'normal');
      const splitNotes = doc.splitTextToSize(activeSession.notes, 180);
      doc.text(splitNotes, 14, finalY + 6);
    }
    
    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Gerado pelo Validador de Protocolo Intelbras - Página ${i} de ${pageCount}`, 14, doc.internal.pageSize.height - 10);
    }

    doc.save(`Validacao_Intelbras_${new Date().getTime()}.pdf`);
  };

  const exportHistoryItemToPDF = (item: ValidationItem) => {
    const doc = new jsPDF();
    
    // Intelbras Green
    const primaryColor: [number, number, number] = [0, 168, 89];
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('INTELBRAS', 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');
    doc.text('Defense IA - Relatório de Validação', 14, 28);
    
    // Line
    doc.setDrawColor(200);
    doc.line(14, 32, 196, 32);
    
    // Info
    doc.setFontSize(10);
    doc.setTextColor(50);
    doc.text(`Data/Hora: ${item.timestamp}`, 14, 40);
    doc.text(`Client: ${item.client}`, 14, 46);
    doc.text(`Status Final: ${item.status === 'valid' ? 'CONFORME' : 'NÃO CONFORME'}`, 14, 52);
    
    // Table
    const tableData = item.rows.map(row => [
      row.campo,
      row.backoffice,
      row.pdf,
      row.status === 'match' ? 'Conforme' : (row.status === 'mismatch' ? 'Divergente' : 'Pendente')
    ]);

    autoTable(doc, {
      startY: 60,
      head: [['Campo', 'Dados Backoffice', 'Dados PDF', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      styles: { font: 'helvetica', fontSize: 9 },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 3) {
          if (data.cell.raw === 'Conforme') {
            data.cell.styles.textColor = [0, 168, 89];
            data.cell.styles.fontStyle = 'bold';
          } else if (data.cell.raw === 'Divergente') {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    // Notes section
    if (item.notes && item.notes.trim()) {
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(10);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text('OBSERVAÇÕES:', 14, finalY);
      
      doc.setFontSize(9);
      doc.setTextColor(80);
      doc.setFont('helvetica', 'normal');
      const splitNotes = doc.splitTextToSize(item.notes, 180);
      doc.text(splitNotes, 14, finalY + 6);
    }
    
    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Gerado pelo Validador de Protocolo Intelbras - Página ${i} de ${pageCount}`, 14, doc.internal.pageSize.height - 10);
    }

    const safeClientName = (item.client || "Relatorio").replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`Relatorio_${safeClientName}_${item.id}.pdf`);
  };

  const exportHistoryToPDF = () => {
    if (filteredHistory.length === 0) return;

    const doc = new jsPDF();
    
    // Intelbras Green
    const primaryColor: [number, number, number] = [0, 168, 89];
    
    const conformesCount = filteredHistory.filter(h => h.status === 'valid').length;
    const divergentesCount = filteredHistory.filter(h => h.status === 'invalid').length;

    // --- PAGE 1: RESUMO GERAL ---
    doc.setFontSize(22);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('INTELBRAS', 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');
    doc.text('Defense IA - Histórico Completo de Validações', 14, 28);
    
    // Line
    doc.setDrawColor(200);
    doc.line(14, 32, 196, 32);
    
    // Info
    doc.setFontSize(10);
    doc.setTextColor(50);
    doc.text(`Data de Exportação: ${new Date().toLocaleString()}`, 14, 40);
    doc.text(`Total de Registros: ${filteredHistory.length}`, 14, 46);
    doc.text(`Conformes: ${conformesCount}`, 14, 52);
    doc.text(`Divergentes: ${divergentesCount}`, 14, 58);
    
    // Table Summary
    const summaryTableData = filteredHistory.map(item => [
      item.id,
      item.timestamp,
      item.client,
      item.servidor,
      item.status === 'valid' ? 'Conforme' : 'Divergente'
    ]);

    autoTable(doc, {
      startY: 65,
      head: [['ID', 'Data/Hora', 'Client', 'Servidor', 'Status Final']],
      body: summaryTableData,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      styles: { font: 'helvetica', fontSize: 9 },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 4) {
          if (data.cell.raw === 'Conforme') {
            data.cell.styles.textColor = [0, 168, 89];
            data.cell.styles.fontStyle = 'bold';
          } else if (data.cell.raw === 'Divergente') {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    // --- DETALHES DE CADA REGISTRO ---
    filteredHistory.forEach((item) => {
      doc.addPage();
      
      doc.setFontSize(22);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text('INTELBRAS', 14, 20);
      
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.setFont('helvetica', 'normal');
      doc.text(`Relatório Detalhado - ID: ${item.id}`, 14, 28);
      
      doc.setDrawColor(200);
      doc.line(14, 32, 196, 32);
      
      doc.setFontSize(10);
      doc.setTextColor(50);
      doc.text(`Data/Hora: ${item.timestamp}`, 14, 40);
      doc.text(`Client: ${item.client}`, 14, 46);
      doc.text(`Servidor: ${item.servidor}`, 14, 52);
      doc.text(`Status Final: ${item.status === 'valid' ? 'CONFORME' : 'NÃO CONFORME'}`, 14, 58);
      
      const itemTableData = item.rows.map(row => [
        row.campo,
        row.backoffice,
        row.pdf,
        row.status === 'match' ? 'Conforme' : (row.status === 'mismatch' ? 'Divergente' : 'Pendente')
      ]);

      autoTable(doc, {
        startY: 65,
        head: [['Campo', 'Dados Backoffice', 'Dados PDF', 'Status']],
        body: itemTableData,
        theme: 'grid',
        headStyles: { fillColor: primaryColor, textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        styles: { font: 'helvetica', fontSize: 9 },
        didParseCell: function(data) {
          if (data.section === 'body' && data.column.index === 3) {
            if (data.cell.raw === 'Conforme') {
              data.cell.styles.textColor = [0, 168, 89];
              data.cell.styles.fontStyle = 'bold';
            } else if (data.cell.raw === 'Divergente') {
              data.cell.styles.textColor = [220, 38, 38];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      });

      // Notes section in history detail
      if (item.notes && item.notes.trim()) {
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFont('helvetica', 'bold');
        doc.text('OBSERVAÇÕES:', 14, finalY);
        
        doc.setFontSize(9);
        doc.setTextColor(80);
        doc.setFont('helvetica', 'normal');
        const splitNotes = doc.splitTextToSize(item.notes, 180);
        doc.text(splitNotes, 14, finalY + 6);
      }
    });
    
    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Gerado pelo Validador de Protocolo Intelbras - Página ${i} de ${pageCount}`, 14, doc.internal.pageSize.height - 10);
    }

    doc.save(`Historico_Validacoes_Intelbras_${new Date().getTime()}.pdf`);
  };

  const resetTable = () => {
    updateActiveSession({ rows: generateInitialRows(baseFields, repeatingFields) });
  };

  const restoreDefaults = () => {
    const DEFAULT_BASE_FIELDS = [
      'Data do Pedido',
      'Client Final',
      'CNPJ',
      'E-mail'
    ];
    const DEFAULT_REPEATING_FIELDS = [
      { name: 'Nome do Item', count: 1 },
      { name: 'Nome do Servidor', count: 1 },
      { name: 'Activation Key', count: 1 }
    ];
    setBaseFields(DEFAULT_BASE_FIELDS);
    setRepeatingFields(DEFAULT_REPEATING_FIELDS);
    setLicenseCount(1);
    setSessions(prev => prev.map(s => ({
      ...s,
      rows: generateInitialRows(DEFAULT_BASE_FIELDS, DEFAULT_REPEATING_FIELDS)
    })));
  };

  return (
    <div className="min-h-screen font-sans flex flex-col bg-[#0A0A0A] text-[#E4E3E0]">
      {/* Header */}
      <header className="border-b border-zinc-800 p-6 flex items-center justify-between bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
            <ShieldCheck className="text-emerald-500" size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white uppercase">
              Intelbras <span className="text-emerald-500">Defense IA</span>
            </h1>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              License Validation Protocol v1.0
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[10px] font-sans font-medium uppercase tracking-widest text-zinc-500">Status do Sistema</span>
            <span className="text-[10px] font-mono text-emerald-500 animate-pulse">OPERACIONAL</span>
          </div>
        </div>
      </header>

      {/* Automation Message Float */}
      <AnimatePresence>
        {automationMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-6 py-4 bg-zinc-900 border border-emerald-500/30 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-xl"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-white uppercase tracking-widest">{automationMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        {/* Left Column: Guide & Stats */}
        <section className="lg:col-span-3 border-r border-zinc-800 p-8 space-y-8 bg-zinc-900/20 overflow-y-auto custom-scrollbar">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-bold text-sm uppercase tracking-widest text-zinc-300">Configuração</h2>
              <button 
                onClick={restoreDefaults}
                className="text-[10px] font-sans font-bold text-zinc-500 hover:text-emerald-500 transition-colors uppercase tracking-widest"
                title="Restaurar campos originais"
              >
                Restaurar Padrões
              </button>
            </div>
            <div className="space-y-6">
              <label className="block">
                <span className="text-[10px] font-sans font-semibold text-zinc-500 uppercase tracking-widest mb-2 block">Quantidade de Itens</span>
                <input 
                  type="number"
                  min="1"
                  value={licenseCount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      handleLicenseCountChange('');
                    } else {
                      const num = parseInt(val, 10);
                      if (!isNaN(num) && num >= 0) {
                        handleLicenseCountChange(num);
                      }
                    }
                  }}
                  onBlur={() => {
                    if (licenseCount === '' || licenseCount < 1) {
                      handleLicenseCountChange(1);
                    }
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs font-sans text-white focus:outline-none focus:border-emerald-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="Ex: 1"
                />
              </label>

              <div className="space-y-4">
                <span className="text-[10px] font-sans font-semibold text-zinc-500 uppercase tracking-widest block">Campos Fixos (Gerais)</span>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {baseFields.map((field, idx) => (
                    <div key={idx} className="flex items-center gap-2 group">
                      <input 
                        type="text"
                        value={field}
                        onChange={(e) => updateBaseField(idx, e.target.value)}
                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg h-10 px-3 text-[10px] font-mono text-zinc-300 focus:outline-none focus:border-emerald-500/30"
                      />
                      <button 
                        onClick={() => removeBaseField(field)}
                        className="p-2 text-zinc-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        title="Remover Campo"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    placeholder="Novo campo fixo..."
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg h-10 px-3 text-[10px] font-mono text-zinc-300 focus:outline-none focus:border-emerald-500/30"
                    onKeyDown={(e) => e.key === 'Enter' && addBaseField()}
                  />
                  <button 
                    onClick={addBaseField}
                    className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-2 rounded hover:bg-emerald-500/20 transition-all"
                  >
                    <Zap size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-zinc-800/50">
                <span className="text-[10px] font-sans font-semibold text-zinc-500 uppercase tracking-widest block">Campos Repetidos (Itens)</span>
                <div className="space-y-6 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                  {repeatingFields.map((field, idx) => (
                    <div key={idx} className="space-y-3 group p-4 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
                      <div className="flex items-center gap-2">
                        <input 
                          type="text"
                          value={field.name}
                          onChange={(e) => updateRepeatingField(idx, e.target.value)}
                          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg h-12 px-4 text-sm font-mono text-zinc-200 focus:outline-none focus:border-emerald-500/30"
                        />
                        <button 
                          onClick={() => removeRepeatingField(field.name)}
                          className="p-3 text-zinc-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          title="Remover Campo Repetido"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <QuantitySelector 
                        value={field.count} 
                        onChange={(val) => updateRepeatingFieldCount(idx, val)} 
                      />
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={newRepeatingFieldName}
                    onChange={(e) => setNewRepeatingFieldName(e.target.value)}
                    placeholder="Novo campo repetido..."
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg h-10 px-3 text-[10px] font-mono text-zinc-300 focus:outline-none focus:border-emerald-500/30"
                    onKeyDown={(e) => e.key === 'Enter' && addRepeatingField()}
                  />
                  <button 
                    onClick={addRepeatingField}
                    className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-2 rounded hover:bg-emerald-500/20 transition-all"
                  >
                    <Zap size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-zinc-800/50">
                <span className="text-[10px] font-sans font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <Save size={12} /> Padrões Salvos
                </span>
                
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Nome do padrão..."
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded p-2 text-[10px] font-mono text-zinc-300 focus:outline-none focus:border-emerald-500/30"
                    onKeyDown={(e) => e.key === 'Enter' && saveTemplate()}
                  />
                  <button 
                    onClick={saveTemplate}
                    disabled={isSavingTemplate || !templateName.trim()}
                    className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-2 rounded hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                    title="Salvar padrão atual"
                  >
                    {isSavingTemplate ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  </button>
                </div>

                {templates.length > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar mt-4">
                    {templates.map((template) => (
                      <div key={template.id} className="flex items-center gap-2 group bg-zinc-950/50 border border-zinc-800/50 rounded p-2">
                        <button
                          onClick={() => loadTemplate(template)}
                          className="flex-1 text-left text-[10px] font-sans font-medium text-zinc-300 hover:text-emerald-400 transition-colors flex items-center gap-2"
                        >
                          <FolderOpen size={12} className="text-zinc-500" />
                          {template.name}
                        </button>
                        <button 
                          onClick={() => deleteTemplate(template.id)}
                          className="p-1 text-zinc-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          title="Excluir padrão"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Automation Control Panel */}
          <div className="p-5 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl space-y-5">
            <div className="flex items-center gap-2 pb-4 border-b border-emerald-500/10">
              <div className="bg-emerald-500/20 p-2 rounded-lg">
                <Zap size={16} className="text-emerald-500" />
              </div>
              <div>
                <h3 className="text-[10px] font-bold text-white uppercase tracking-widest">Painel da Automação</h3>
                <p className="text-[8px] font-mono text-emerald-500/70 uppercase">Robot Framework Control</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="flex justify-between items-center">
                  <span className="text-[9px] font-sans font-bold text-zinc-500 uppercase tracking-widest">Qtd. Testes Simultâneos</span>
                  <span className="text-[10px] font-mono text-emerald-500">{quantidade}</span>
                </label>
                <input 
                  type="range"
                  min="1"
                  max="50"
                  step="1"
                  value={quantidade}
                  onChange={(e) => setQuantidade(Number(e.target.value))}
                  disabled={isAutomating}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[8px] font-mono text-zinc-600">
                  <span>1</span>
                  <span>25</span>
                  <span>50</span>
                </div>
              </div>

              <div className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-800/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-mono text-zinc-500 uppercase">Filtro Ativo:</span>
                  <span className="text-[8px] font-mono text-zinc-300 uppercase">
                    {selectedClients.length > 0 ? `${selectedClients.length} Clientes` : 'Todos'}
                  </span>
                </div>
                {selectedClients.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedClients.slice(0, 3).map(c => (
                      <span key={c} className="px-2 py-0.5 bg-zinc-900 text-[7px] text-zinc-500 rounded border border-zinc-800">{c}</span>
                    ))}
                    {selectedClients.length > 3 && <span className="text-[7px] text-zinc-600">+{selectedClients.length - 3}</span>}
                  </div>
                )}
              </div>

              <button 
                onClick={startAutomation}
                disabled={isAutomating}
                className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                  isAutomating 
                    ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-zinc-700' 
                    : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_10px_20px_rgba(16,185,129,0.2)] active:scale-[0.98]'
                }`}
              >
                {isAutomating ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Zap size={16} fill="currentColor" />
                )}
                {isAutomating ? 'Processando...' : 'Iniciar Robot'}
              </button>
            </div>
          </div>

          <div>
            <h2 className="font-display font-bold text-sm uppercase tracking-widest mb-6 text-zinc-300">Instruções</h2>
            <div className="space-y-4 text-xs text-zinc-400 font-sans leading-relaxed">
              <p>1. Insira os dados do <span className="text-emerald-500">BackOffice</span> na primeira coluna.</p>
              <p>2. Insira os dados extraídos do <span className="text-emerald-500">PDF</span> na segunda coluna.</p>
              <p>3. O sistema validará cada campo automaticamente.</p>
              <p>4. Quando todos os campos estiverem preenchidos, o resumo final será exibido.</p>
            </div>
          </div>

          <AnimatePresence>
            {showGuide && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-2">
                  <button onClick={() => setShowGuide(false)} className="text-zinc-600 hover:text-zinc-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-emerald-500 shrink-0 mt-1" size={20} />
                  <div>
                    <h3 className="text-xs font-bold text-zinc-200 uppercase mb-2 tracking-wider">Guia de Precisão</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                      "Para validação ultra-rápida, foque nos <span className="text-emerald-400">4 últimos dígitos</span> da chave. Se baterem, a probabilidade de erro é mínima."
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Middle Column: Validation Area */}
        <section className="lg:col-span-6 border-r border-zinc-800 p-8 space-y-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-3">
                <h2 className="font-display font-bold text-lg text-zinc-300">Validação em Tabela</h2>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar max-w-md">
                  {sessions.map((session) => (
                    <div key={session.id} className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setActiveSessionId(session.id)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border ${
                          activeSessionId === session.id
                            ? 'bg-emerald-500 text-black border-emerald-500'
                            : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        {session.name}
                      </button>
                      {sessions.length > 1 && (
                        <button
                          onClick={() => removeSession(session.id)}
                          className="p-1.5 text-zinc-600 hover:text-red-500 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => createNewSession()}
                    className="p-1.5 bg-zinc-800 border border-zinc-700 text-zinc-400 rounded-lg hover:text-white transition-all shrink-0"
                    title="Adicionar Nova Tabela"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={resetTable}
                  className="bg-zinc-800 border border-zinc-700 text-zinc-400 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:text-white transition-all"
                >
                  Resetar Tabela
                </button>
              </div>
            </div>

            <div className="overflow-hidden border border-zinc-800 rounded-xl bg-zinc-900/50">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-900 border-b border-zinc-800">
                    <th className="p-4 text-[10px] font-sans font-bold text-zinc-500 uppercase tracking-widest">Campo</th>
                    <th className="p-4 text-[10px] font-sans font-bold text-zinc-500 uppercase tracking-widest">BackOffice</th>
                    <th className="p-4 text-[10px] font-sans font-bold text-zinc-500 uppercase tracking-widest">No PDF (Fonte)</th>
                    <th className="p-4 text-[10px] font-sans font-bold text-zinc-500 uppercase tracking-widest text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {activeSession.rows.map((row, idx) => (
                    <tr 
                      key={row.campo} 
                      className="hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="p-4 text-xs font-bold text-zinc-300">{row.campo}</td>
                      <td className="p-2">
                        <input 
                          type="text"
                          value={row.backoffice}
                          onChange={(e) => updateRow(idx, 'backoffice', e.target.value)}
                          placeholder="Valor BackOffice..."
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg h-12 px-4 text-sm font-mono text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="text"
                          value={row.pdf}
                          onChange={(e) => updateRow(idx, 'pdf', e.target.value)}
                          placeholder="Valor no PDF..."
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg h-12 px-4 text-sm font-mono text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                        />
                      </td>
                      <td className="p-4 text-center">
                        {row.status === 'match' ? (
                          <div className="inline-flex items-center gap-1.5 text-emerald-500 text-[10px] font-bold uppercase">
                            <Check size={14} /> Conforme
                          </div>
                        ) : row.status === 'mismatch' ? (
                          <div className="inline-flex items-center gap-1.5 text-red-500 text-[10px] font-bold uppercase">
                            <X size={14} /> Divergente
                          </div>
                        ) : (
                          <span className="text-zinc-700 text-[10px] italic">Pendente</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Notes Area */}
            <div className="mt-8 p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl">
              <div className="flex items-center gap-2 mb-4">
                <FileText size={16} className="text-emerald-500" />
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Observações do Relatório</h3>
              </div>
              <textarea
                value={activeSession.notes}
                onChange={(e) => updateActiveSession({ notes: e.target.value })}
                placeholder="Digite aqui observações, ressalvas ou detalhes adicionais que devem constar no PDF..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-xs font-sans text-zinc-300 focus:outline-none focus:border-emerald-500/50 min-h-[100px] resize-none"
              />
            </div>

            {/* Final Result Summary & Actions */}
            <div className="space-y-4 pt-4 border-t border-zinc-800">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-sans font-bold text-zinc-500 uppercase tracking-widest">Ações Rápidas</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={resetTable}
                    className="text-[10px] font-sans font-bold text-zinc-600 hover:text-zinc-400 transition-colors uppercase tracking-widest"
                  >
                    Limpar Tabela
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={() => saveToHistory()}
                  disabled={!allFilled}
                  className="w-full bg-emerald-500 text-black font-bold py-4 rounded-xl text-xs uppercase tracking-widest hover:bg-emerald-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                >
                  <Save size={16} /> Salvar Esta Tabela
                </button>
                
                {sessions.length > 1 && (
                  <button 
                    onClick={saveAllToHistory}
                    disabled={!sessions.every(s => s.rows.every(r => r.backoffice.trim() !== '' && r.pdf.trim() !== ''))}
                    className="w-full bg-zinc-800 text-white font-bold py-4 rounded-xl text-xs uppercase tracking-widest hover:bg-zinc-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-zinc-700"
                  >
                    <ClipboardCheck size={16} /> Salvar Todas ({sessions.length})
                  </button>
                )}

                <button 
                  onClick={exportToPDF}
                  disabled={!allFilled}
                  className="w-full bg-zinc-900 border border-zinc-800 text-white font-bold py-4 rounded-xl text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FileText size={16} /> Exportar PDF (Atual)
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Summary & History */}
        <section className="lg:col-span-3 p-8 space-y-8 bg-zinc-950/30 overflow-y-auto max-h-screen custom-scrollbar">
          <div className="space-y-6">
            <h2 className="font-display font-bold text-sm uppercase tracking-widest text-zinc-300">Resumo da Tabela</h2>
            
            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4 relative overflow-hidden group">
              <div className={`absolute top-0 left-0 w-1 h-full ${allFilled ? (allMatched ? 'bg-emerald-500' : 'bg-red-500') : 'bg-zinc-800'}`} />
              
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Status Atual</span>
                {allFilled ? (
                  allMatched ? (
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                      <CheckCircle2 size={12} /> Conforme
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1">
                      <AlertCircle size={12} /> Divergente
                    </span>
                  )
                ) : (
                  <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Incompleto</span>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-2xl font-display font-bold text-white">
                    {activeSession.rows.filter(r => r.status === 'match').length}
                    <span className="text-zinc-700 text-sm font-normal ml-1">/ {activeSession.rows.length}</span>
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Campos Válidos</span>
                </div>
                <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(activeSession.rows.filter(r => r.status === 'match').length / activeSession.rows.length) * 100}%` }}
                    className={`h-full ${allMatched ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-zinc-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-bold text-sm uppercase tracking-widest text-zinc-300 flex items-center gap-2">
                <History size={16} className="text-zinc-500" /> Histórico
              </h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`p-2 rounded-lg transition-all ${showAdvancedFilters ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'text-zinc-500 hover:text-white border border-transparent'}`}
                  title="Filtros Avançados"
                >
                  <Filter size={16} />
                </button>
                {history.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={exportHistoryToPDF} 
                      className="text-zinc-500 hover:text-emerald-500 transition-colors"
                      title="Exportar PDF"
                    >
                      <Download size={16} />
                    </button>
                    <button 
                      onClick={clearHistory} 
                      className="text-zinc-500 hover:text-red-400 transition-colors"
                      title="Limpar Histórico"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <AnimatePresence>
              {showAdvancedFilters && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mb-8 space-y-6 overflow-hidden border-b border-zinc-800 pb-8"
                >
                  <div className="grid grid-cols-1 gap-6">
                    {/* Status Toggle */}
                    <div className="space-y-3">
                      <span className="text-[10px] font-sans font-bold text-zinc-500 uppercase tracking-widest block">Filtrar por Status</span>
                      <div className="flex gap-2">
                        {['all', 'valid', 'invalid'].map((st) => (
                          <button
                            key={st}
                            onClick={() => setHistoryFilter(st as any)}
                            className={`flex-1 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest border transition-all ${
                              historyFilter === st 
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' 
                                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                            }`}
                          >
                            {st === 'all' ? 'Todos' : st === 'valid' ? 'Conforme' : 'Divergente'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Multi-client Select */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-sans font-bold text-zinc-500 uppercase tracking-widest block">Selecionar Clientes</span>
                        {selectedClients.length > 0 && (
                          <button 
                            onClick={() => setSelectedClients([])}
                            className="text-[9px] font-bold text-emerald-500 uppercase"
                          >
                            Limpar Seleção
                          </button>
                        )}
                      </div>
                      <div className="max-h-32 overflow-y-auto pr-2 custom-scrollbar space-y-2 bg-zinc-950/50 p-3 rounded-xl border border-zinc-800">
                        {uniqueClients.length === 0 ? (
                          <span className="text-[10px] text-zinc-600 block text-center py-2">Nenhum cliente no histórico</span>
                        ) : uniqueClients.map(client => (
                          <label key={client} className="flex items-center gap-3 cursor-pointer group">
                             <div className="relative flex items-center justify-center">
                                <input 
                                  type="checkbox"
                                  checked={selectedClients.includes(client)}
                                  onChange={() => {
                                    setSelectedClients(prev => 
                                      prev.includes(client) ? prev.filter(c => c !== client) : [...prev, client]
                                    );
                                  }}
                                  className="peer appearance-none w-4 h-4 rounded border border-zinc-700 bg-zinc-900 checked:bg-emerald-500 checked:border-emerald-500 transition-all cursor-pointer"
                                />
                                <Check size={10} className="absolute text-black opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                             </div>
                             <span className="text-[10px] font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors truncate">
                               {client}
                             </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Date/Time Range */}
                    <div className="space-y-4">
                      <span className="text-[10px] font-sans font-bold text-zinc-500 uppercase tracking-widest block">Intervalo de Data e Hora</span>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <label className="text-[9px] font-mono text-zinc-600 uppercase">Início</label>
                          <div className="relative">
                            <Calendar size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input 
                              type="date"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-[10px] text-zinc-300 focus:outline-none focus:border-emerald-500/50"
                            />
                          </div>
                          <div className="relative">
                            <Clock size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input 
                              type="time"
                              value={startTime}
                              onChange={(e) => setStartTime(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-[10px] text-zinc-300 focus:outline-none focus:border-emerald-500/50"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-mono text-zinc-600 uppercase">Fim</label>
                          <div className="relative">
                            <Calendar size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input 
                              type="date"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-[10px] text-zinc-300 focus:outline-none focus:border-emerald-500/50"
                            />
                          </div>
                          <div className="relative">
                            <Clock size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input 
                              type="time"
                              value={endTime}
                              onChange={(e) => setEndTime(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-[10px] text-zinc-300 focus:outline-none focus:border-emerald-500/50"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => {
                        setStartDate('');
                        setStartTime('');
                        setEndDate('');
                        setEndTime('');
                        setHistoryFilter('all');
                        setSelectedClients([]);
                        setHistorySearch('');
                      }}
                      className="w-full py-3 rounded-xl border border-zinc-800 bg-zinc-900/50 text-[10px] font-bold text-zinc-500 uppercase tracking-widest hover:text-white hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
                    >
                      <RotateCcw size={14} /> Limpar Todos os Filtros
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-3 mb-6">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="Buscar no histórico..." 
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-[10px] text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>

            <div className="space-y-3">
              {history.length === 0 ? (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 opacity-30">
                  <History size={24} className="text-zinc-700" />
                  <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">Nenhum registro</p>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 opacity-30">
                  <Search size={24} className="text-zinc-700" />
                  <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">Sem resultados</p>
                </div>
              ) : (
                filteredHistory.slice(0, 10).map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => setSelectedHistoryItem(item)}
                    className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg group hover:border-emerald-500/30 transition-all cursor-pointer hover:bg-zinc-800/50"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="text-[10px] font-bold text-zinc-300 truncate flex-1 pr-2">
                        {item.client}
                      </div>
                      <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${item.status === 'valid' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    </div>
                    <div className="text-[8px] font-mono text-zinc-500 uppercase tracking-tight">
                      {item.timestamp}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>

      {/* History Detail Modal */}
      <AnimatePresence>
        {selectedHistoryItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${selectedHistoryItem.status === 'valid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                    <ClipboardCheck size={20} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-widest text-white">Detalhes da Validação</h2>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase">{selectedHistoryItem.timestamp} • ID: {selectedHistoryItem.id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedHistoryItem(null)}
                  className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">Client Final</span>
                    <p className="text-sm font-bold text-zinc-200">{selectedHistoryItem.client}</p>
                  </div>
                  <div className={`p-4 rounded-xl border ${selectedHistoryItem.status === 'valid' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">Status Final</span>
                    <p className={`text-sm font-bold ${selectedHistoryItem.status === 'valid' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {selectedHistoryItem.status === 'valid' ? 'CONFORME' : 'NÃO CONFORME'}
                    </p>
                  </div>
                </div>

                <div className="border border-zinc-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-950 border-b border-zinc-800">
                        <th className="p-3 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Campo</th>
                        <th className="p-3 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">BackOffice</th>
                        <th className="p-3 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">No PDF (Fonte)</th>
                        <th className="p-3 text-[10px] font-mono text-zinc-500 uppercase tracking-widest text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {selectedHistoryItem.rows.map((row) => (
                        <tr key={row.campo} className="bg-zinc-900/30">
                          <td className="p-3 text-[11px] font-bold text-zinc-400">{row.campo}</td>
                          <td className="p-3 text-[11px] font-mono text-zinc-300">{row.backoffice}</td>
                          <td className="p-3 text-[11px] font-mono text-zinc-300">{row.pdf}</td>
                          <td className="p-3 text-center">
                            {row.status === 'match' ? (
                              <span className="text-emerald-500 text-[9px] font-bold uppercase">Conforme</span>
                            ) : (
                              <span className="text-red-500 text-[9px] font-bold uppercase">Divergente</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {selectedHistoryItem.notes && (
                  <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-2">Observações do Relatório</span>
                    <p className="text-xs text-zinc-400 leading-relaxed font-sans italic">
                      "{selectedHistoryItem.notes}"
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex justify-end gap-3">
                <button 
                  onClick={() => exportHistoryItemToPDF(selectedHistoryItem)}
                  className="px-6 py-2 bg-zinc-800 text-zinc-300 text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-zinc-700 hover:text-white transition-colors flex items-center gap-2"
                >
                  <FileText size={14} /> Exportar PDF
                </button>
                <button 
                  onClick={() => setSelectedHistoryItem(null)}
                  className="px-6 py-2 bg-emerald-500 text-black text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-emerald-400 transition-colors"
                >
                  Fechar Detalhes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-zinc-800 p-4 bg-zinc-950 text-center">
        <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.3em]">
          Desenvolvido para Precisão Técnica & Velocidade Operacional
        </p>
      </footer>
    </div>
  );
}
