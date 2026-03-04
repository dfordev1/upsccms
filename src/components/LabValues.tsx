import React, { useState } from 'react';
import { X } from 'lucide-react';

const labData = {
  Blood: [
    { test: 'Hemoglobin (male)', value: '13.5 - 17.5 g/dL' },
    { test: 'Hemoglobin (female)', value: '12.0 - 15.5 g/dL' },
    { test: 'Hematocrit (male)', value: '41 - 50%' },
    { test: 'Hematocrit (female)', value: '36 - 48%' },
    { test: 'WBC count', value: '4,500 - 11,000 /µL' },
    { test: 'Platelet count', value: '150,000 - 450,000 /µL' },
    { test: 'Sodium (Na+)', value: '136 - 145 mEq/L' },
    { test: 'Potassium (K+)', value: '3.5 - 5.0 mEq/L' },
    { test: 'Chloride (Cl-)', value: '95 - 105 mEq/L' },
    { test: 'Bicarbonate (HCO3-)', value: '22 - 28 mEq/L' },
    { test: 'BUN', value: '7 - 18 mg/dL' },
    { test: 'Creatinine', value: '0.6 - 1.2 mg/dL' },
    { test: 'Glucose (fasting)', value: '70 - 100 mg/dL' },
    { test: 'Calcium (total)', value: '8.4 - 10.2 mg/dL' },
  ],
  CSF: [
    { test: 'Opening pressure', value: '70 - 180 mm H2O' },
    { test: 'Total protein', value: '15 - 45 mg/dL' },
    { test: 'Glucose', value: '50 - 80 mg/dL (or 60% of serum)' },
    { test: 'Cell count', value: '0 - 5 WBCs/µL' },
  ],
  Urine: [
    { test: 'Specific gravity', value: '1.003 - 1.030' },
    { test: 'pH', value: '4.5 - 8.0' },
    { test: 'Protein', value: '< 150 mg/24 hr' },
  ]
};

export default function LabValues({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<keyof typeof labData>('Blood');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-800 text-white rounded-t-lg">
          <h2 className="text-lg font-semibold">Normal Laboratory Values</h2>
          <button onClick={onClose} className="text-slate-300 hover:text-white">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex border-b border-slate-200 bg-slate-50">
          {(Object.keys(labData) as Array<keyof typeof labData>).map((tab) => (
            <button
              key={tab}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-uw-blue text-uw-blue bg-white'
                  : 'border-transparent text-slate-600 hover:text-uw-navy hover:bg-slate-100'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-0 overflow-y-auto flex-1">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Test
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Reference Range
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {labData[activeTab].map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                    {item.test}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-slate-600">
                    {item.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
