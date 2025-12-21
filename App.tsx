
import React, { useState, useMemo, useCallback } from 'react';
import { FUTURES_LIST } from './constants';
import { FutureContract, CalculationResult, RiskAnalysis } from './types';
import { analyzeRisk } from './geminiService';

const formatter = new Intl.NumberFormat('zh-TW', {
  style: 'currency',
  currency: 'TWD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const ResultCard: React.FC<{ label: string; value: string; ratio: string; color: string; description?: string }> = ({ label, value, ratio, color, description }) => (
  <div className={`${color} p-6 rounded-3xl border shadow-sm transition-all hover:scale-[1.02] hover:shadow-lg group`}>
    <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">{label}</p>
    <p className="text-3xl font-black mb-1">{value}</p>
    <div className="flex justify-between items-center mt-3 pt-3 border-t border-black/5">
      <span className="text-xs font-medium opacity-60">比例: {ratio}</span>
      {description && <span className="text-[10px] font-bold opacity-40 group-hover:opacity-100 transition-opacity uppercase">{description}</span>}
    </div>
  </div>
);

const App: React.FC = () => {
  const [selectedCode, setSelectedCode] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [contracts, setContracts] = useState<string>('1');
  const [loading, setLoading] = useState<boolean>(false);
  const [riskAnalysis, setRiskAnalysis] = useState<RiskAnalysis | null>(null);

  const filteredFutures = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return FUTURES_LIST.filter(f => 
      f.name.toLowerCase().includes(term) || 
      f.stockCode.includes(term) || 
      f.code.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  const selectedFuture = useMemo(() => 
    FUTURES_LIST.find(f => f.code === selectedCode), 
    [selectedCode]
  );

  const results = useMemo<CalculationResult | null>(() => {
    const p = parseFloat(price);
    const c = parseInt(contracts);
    if (!selectedFuture || isNaN(p) || p <= 0 || isNaN(c) || c <= 0) return null;

    const contractValue = p * selectedFuture.sharesPerContract * c;
    
    return {
      contractValue,
      settlement: contractValue * selectedFuture.ratio.s,
      maintenance: contractValue * selectedFuture.ratio.m,
      initial: contractValue * selectedFuture.ratio.i,
      leverage: 1 / selectedFuture.ratio.i
    };
  }, [selectedFuture, price, contracts]);

  const handleAnalyze = useCallback(async () => {
    if (!selectedFuture || !results) return;
    setLoading(true);
    try {
      const analysis = await analyzeRisk(
        selectedFuture.name,
        selectedFuture.stockCode,
        results.leverage,
        results.initial,
        parseFloat(price)
      );
      setRiskAnalysis(analysis);
    } finally {
      setLoading(false);
    }
  }, [selectedFuture, results, price]);

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto selection:bg-indigo-100">
      <header className="text-center mb-12">
        <div className="inline-block bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-4">
          Taiwan Market Tools
        </div>
        <h1 className="text-5xl font-black text-slate-900 tracking-tight mb-4">
          股票期貨保證金試算
        </h1>
        <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto leading-relaxed">
          精確計算臺灣市場個股期貨保證金階層，結合 AI 技術深度剖析交易風險。
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Input Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[2rem] p-8 shadow-2xl shadow-slate-200/50 border border-slate-100 sticky top-8">
            <h2 className="text-xl font-bold text-slate-800 mb-8 flex items-center">
              <div className="w-2 h-7 bg-indigo-600 rounded-full mr-4"></div>
              交易參數設定
            </h2>
            
            <div className="space-y-6">
              <div className="relative">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">搜尋與選擇標的</label>
                <div className="relative group">
                  <input 
                    type="text"
                    placeholder="輸入名稱、代號或股票代碼..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none group-focus-within:text-indigo-500 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                </div>

                {searchTerm && !selectedCode && (
                  <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl max-h-60 overflow-y-auto scrollbar-hide">
                    {filteredFutures.length > 0 ? filteredFutures.map(f => (
                      <button 
                        key={f.code}
                        onClick={() => {
                          setSelectedCode(f.code);
                          setSearchTerm(`${f.name} (${f.stockCode})`);
                          setRiskAnalysis(null);
                        }}
                        className="w-full text-left px-5 py-3 hover:bg-indigo-50 transition-colors flex justify-between items-center group"
                      >
                        <span className="font-semibold text-slate-700 group-hover:text-indigo-700">{f.name}</span>
                        <span className="text-xs bg-slate-100 px-2 py-1 rounded-md text-slate-500 font-mono">{f.stockCode}</span>
                      </button>
                    )) : (
                      <div className="p-5 text-center text-slate-400 text-sm">找不到相關標的</div>
                    )}
                  </div>
                )}
                
                {selectedCode && (
                  <button 
                    onClick={() => { setSelectedCode(''); setSearchTerm(''); setRiskAnalysis(null); }}
                    className="mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center transition-colors"
                  >
                    重選標的 <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">當前股價</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">口數</label>
                  <input 
                    type="number" 
                    min="1"
                    value={contracts}
                    onChange={(e) => setContracts(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-bold"
                  />
                </div>
              </div>

              {selectedFuture && (
                <div className="pt-6 border-t border-slate-100">
                  <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">合約詳情</p>
                        <h3 className="text-xl font-black">{selectedFuture.name}</h3>
                      </div>
                      <span className="text-xs bg-white/20 px-2 py-1 rounded-lg font-mono">{selectedFuture.code}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="opacity-70">合約規模</span>
                        <span className="font-bold">{selectedFuture.sharesPerContract.toLocaleString()} 股 / 口</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="opacity-70">原始保證金比例</span>
                        <span className="font-bold">{(selectedFuture.ratio.i * 100).toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white rounded-[2rem] p-10 shadow-2xl shadow-slate-200/50 border border-slate-100 min-h-[500px] flex flex-col">
            <h2 className="text-2xl font-black text-slate-800 mb-10 pb-6 border-b border-slate-50 flex justify-between items-center">
              <span>資產試算回報</span>
              {results && <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest">Live Preview</span>}
            </h2>

            {results ? (
              <div className="space-y-10 flex-grow animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <ResultCard 
                    label="原始保證金" 
                    value={formatter.format(results.initial)}
                    ratio={(selectedFuture!.ratio.i * 100).toFixed(2) + '%'}
                    color="bg-[#fff1f2] border-rose-100 text-rose-900"
                    description="Initial"
                  />
                  <ResultCard 
                    label="維持保證金" 
                    value={formatter.format(results.maintenance)}
                    ratio={(selectedFuture!.ratio.m * 100).toFixed(2) + '%'}
                    color="bg-[#fffbeb] border-amber-100 text-amber-900"
                    description="Maintenance"
                  />
                  <ResultCard 
                    label="結算保證金" 
                    value={formatter.format(results.settlement)}
                    ratio={(selectedFuture!.ratio.s * 100).toFixed(2) + '%'}
                    color="bg-[#eff6ff] border-blue-100 text-blue-900"
                    description="Settlement"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-8 bg-slate-900 rounded-[2rem] text-white flex flex-col justify-center relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                      <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">合約總價值</p>
                    <p className="text-4xl font-black text-white leading-none">{formatter.format(results.contractValue)}</p>
                    <p className="text-xs text-slate-400 mt-4 flex items-center">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></span>
                      1% 價格變動盈虧: <span className="text-white font-bold ml-1">{formatter.format(results.contractValue * 0.01)}</span>
                    </p>
                  </div>

                  <div className="p-8 bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-[2rem] flex flex-col justify-center text-center">
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em] mb-2">資金槓桿倍數</p>
                    <p className="text-5xl font-black text-indigo-600 leading-none">{results.leverage.toFixed(2)} <span className="text-2xl">x</span></p>
                    <p className="text-xs text-indigo-400 mt-4 font-bold">高槓桿具備顯著風險</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {!riskAnalysis ? (
                    <button 
                      onClick={handleAnalyze}
                      disabled={loading}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-6 rounded-3xl transition-all shadow-2xl shadow-slate-300 flex items-center justify-center space-x-3 disabled:opacity-50 group active:scale-95"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>正在演算風險模型...</span>
                        </>
                      ) : (
                        <>
                          <div className="bg-indigo-500 p-1.5 rounded-lg group-hover:rotate-12 transition-transform">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          </div>
                          <span className="text-lg tracking-tight">AI 智能風險診斷</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[2.5rem] p-10 text-white space-y-8 animate-in zoom-in-95 duration-700 shadow-2xl shadow-indigo-500/20 relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                        <svg className="w-64 h-64 rotate-12" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-indigo-400 rounded-full animate-pulse"></div>
                        <h3 className="text-sm font-bold uppercase tracking-[0.3em] text-indigo-300">AI Risk Intelligence Reports</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                        <div className="space-y-3">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                            <span className="w-1 h-3 bg-indigo-500 rounded-full mr-2"></span> 槓桿效應分析
                          </p>
                          <p className="text-sm text-slate-200 leading-relaxed font-medium">{riskAnalysis.leverageRisk}</p>
                        </div>
                        <div className="space-y-3">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                            <span className="w-1 h-3 bg-rose-500 rounded-full mr-2"></span> 追繳壓力預警
                          </p>
                          <p className="text-sm text-slate-200 leading-relaxed font-medium">{riskAnalysis.marginCallRisk}</p>
                        </div>
                      </div>

                      <div className="pt-8 border-t border-white/10 relative z-10">
                        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                          <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-3">專業交易建議</p>
                          <p className="text-lg font-bold text-white leading-relaxed tracking-tight">"{riskAnalysis.recommendation}"</p>
                        </div>
                        <button 
                          onClick={() => setRiskAnalysis(null)}
                          className="mt-6 text-[10px] font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-[0.2em] flex items-center"
                        >
                          <svg className="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          重新生成分析
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-slate-200 space-y-6">
                <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center">
                  <svg className="w-16 h-16 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-slate-400 font-bold text-lg mb-1 tracking-tight">等待輸入參數</p>
                  <p className="text-slate-300 text-sm font-medium">請在左側面板搜尋並選擇合適的期貨合約標的</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="mt-20 pt-12 border-t border-slate-100">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 text-slate-400">
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-2 text-slate-900 mb-4">
              <div className="w-6 h-6 bg-slate-900 rounded-lg"></div>
              <span className="font-black text-xl tracking-tight">TaiwanMargin AI</span>
            </div>
            <p className="text-sm leading-relaxed mb-6">
              專為專業交易者打造的臺灣市場股票期貨試算系統，整合 AI 風險分析與即時保證金門檻預估。
            </p>
            <div className="flex space-x-4">
              <div className="w-8 h-8 bg-slate-100 rounded-full"></div>
              <div className="w-8 h-8 bg-slate-100 rounded-full"></div>
              <div className="w-8 h-8 bg-slate-100 rounded-full"></div>
            </div>
          </div>
          
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <p className="font-black text-slate-800 text-xs uppercase tracking-widest mb-6">計算規則摘要</p>
              <ul className="space-y-3 text-xs font-medium">
                <li className="flex items-start"><span className="w-1 h-1 bg-indigo-500 rounded-full mt-1.5 mr-3 shrink-0"></span> 合約規模：小型合約為 100 股，標準合約為 2,000 股。</li>
                <li className="flex items-start"><span className="w-1 h-1 bg-indigo-500 rounded-full mt-1.5 mr-3 shrink-0"></span> 保證金試算：以現價乘上合約總股數及各階層比例。</li>
                <li className="flex items-start"><span className="w-1 h-1 bg-indigo-500 rounded-full mt-1.5 mr-3 shrink-0"></span> 盈虧變動：每一元股價跳動對應之價值變動。</li>
              </ul>
            </div>
            <div>
              <p className="font-black text-slate-800 text-xs uppercase tracking-widest mb-6">法律免責與警語</p>
              <p className="text-[10px] leading-relaxed">
                期貨交易具有高度風險，本系統提供之試算結果與 AI 風險洞察僅供策略輔助參考，不構成任何投資建議。實際保證金需求應以期交所公告與所屬期貨商帳務資訊為最終準則。交易者應自行評估財務狀況並承擔相關損益。
              </p>
            </div>
          </div>
        </div>
        <div className="mt-12 text-center text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em]">
          &copy; 2024 Taiwan Stock Futures AI Assistant. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
};

export default App;
