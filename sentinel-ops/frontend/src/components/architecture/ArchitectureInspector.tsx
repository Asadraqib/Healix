import React, { useState } from 'react';
import { ShieldCheck, Database, Layers, Terminal, Lock } from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';

export const ArchitectureInspector: React.FC = () => {
  const { userRole } = useSimulation();
  const [selectedService, setSelectedService] = useState<string>('gateway');

  const services = [
    {
      id: 'gateway',
      name: 'Spring Cloud Gateway',
      port: 8080,
      tech: 'Spring Cloud Gateway • Java 25+',
      description:
        'Single browser API entry point. Validates the session JWT and enforces role permissions and mode write restrictions.',
      routes: [
        { path: '/api/auth/**', dest: 'auth-service:8084', auth: 'Public' },
        { path: '/api/assets/**', dest: 'asset-service:8081', auth: 'AuthenticationFilter' },
        { path: '/api/parts/**', dest: 'maintenance-service:8082', auth: 'AuthenticationFilter' },
        {
          path: '/api/suppliers/**',
          dest: 'maintenance-service:8082',
          auth: 'AuthenticationFilter',
        },
        {
          path: '/api/work-orders/**',
          dest: 'maintenance-service:8082',
          auth: 'AuthenticationFilter',
        },
        { path: '/api/ai/**', dest: 'ai-service:8083', auth: 'AuthenticationFilter' },
        { path: '/api/simulation/**', dest: 'asset-service:8081', auth: 'AuthenticationFilter' },
      ],
    },
    {
      id: 'asset-service',
      name: 'Asset Service',
      port: 8081,
      tech: 'Spring Boot • PostgreSQL (asset schema) • Flyway',
      description:
        'Registers machinery, ingests normalized readings, generates demo telemetry, and persists reading history.',
      routes: [
        { path: 'GET /api/assets', dest: 'List all machinery', auth: 'X-User-Role' },
        { path: 'GET /api/assets/{id}', dest: 'Machine detail & specs', auth: 'X-User-Role' },
        {
          path: 'POST /api/assets/{id}/telemetry',
          dest: 'Ingest equipment readings',
          auth: 'X-User-Role',
        },
      ],
    },
    {
      id: 'ai-service',
      name: 'AI / RAG Prediction Service',
      port: 8083,
      tech: 'Python • FastAPI • Qdrant • Groq',
      description:
        'Analyzes current maintenance records with the configured Groq provider. Retrieves uploaded document sections from Qdrant with source references.',
      routes: [
        {
          path: 'POST /api/ai/forecast',
          dest: 'Explain maintenance risk and recommended checks',
          auth: 'Edge Header',
        },
        {
          path: 'POST /api/ai/diagnose',
          dest: 'Qdrant vector retrieval + LLM synthesis',
          auth: 'Edge Header',
        },
      ],
    },
    {
      id: 'maintenance-service',
      name: 'Maintenance & Work Orders Service',
      port: 8082,
      tech: 'Spring Boot • PostgreSQL (maintenance schema) • Flyway',
      description:
        'Detects threshold incidents and persists work orders, assignments, resolutions, stock movements, and supplier reorder suggestions.',
      routes: [
        {
          path: 'GET /api/work-orders',
          dest: 'Query active & resolved tickets',
          auth: 'X-User-Role',
        },
        {
          path: 'POST /api/work-orders',
          dest: 'Autonomous closed-loop creation',
          auth: 'X-User-Role',
        },
        {
          path: 'PATCH /api/work-orders/{id}',
          dest: 'Update assignment or repair status',
          auth: 'X-User-Role',
        },
      ],
    },
    {
      id: 'simulation-service',
      name: 'Demo telemetry and equipment adapters',
      port: 8081,
      tech: 'Asset service • WebSocket telemetry',
      description:
        'Generated LIVE demo readings are persisted by the asset service. Browser SIMULATION changes stay temporary and do not use these LIVE write routes.',
      routes: [
        { path: 'WS /ws/simulation', dest: 'Live telemetry broadcast', auth: 'Public' },
        {
          path: 'POST /api/simulation/{id}/override',
          dest: 'Inject judge test value',
          auth: 'X-User-Role',
        },
        { path: 'POST /api/simulation/{id}/reset', dest: 'Reset to baseline', auth: 'X-User-Role' },
      ],
    },
  ];

  const activeServiceData = services.find((s) => s.id === selectedService) || services[0];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200/90 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold uppercase tracking-wider">
            Enterprise Architecture Blueprint
          </span>
          <span className="text-xs font-mono text-gray-500">
            SAP BTP & Siemens Smart Infrastructure Compatible
          </span>
        </div>
        <h1 className="text-2xl font-black text-gray-900 mt-1 tracking-tight">
          Microservices Topology & Edge Gateway Routing
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Spring Cloud Gateway with perimeter edge authentication, independent Spring Boot services
          with Flyway schemas, and a Python FastAPI AI layer.
        </p>
      </div>

      {/* Recruiter Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-950 text-white p-4 rounded-xl border border-blue-800">
          <ShieldCheck className="w-5 h-5 text-cyan-400 mb-1" />
          <h4 className="font-bold text-xs text-cyan-200">Edge Perimeter Auth</h4>
          <p className="text-[11px] text-slate-300 mt-1">
            Gateway verifies the session JWT and applies role permissions. Internal service ports
            remain on the private container network.
          </p>
        </div>

        <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800">
          <Database className="w-5 h-5 text-emerald-400 mb-1" />
          <h4 className="font-bold text-xs text-emerald-200">Database per Service</h4>
          <p className="text-[11px] text-slate-300 mt-1">
            Each Spring service runs on its own isolated Postgres schema with automated Flyway
            `V1__` migrations.
          </p>
        </div>

        <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800">
          <Layers className="w-5 h-5 text-purple-400 mb-1" />
          <h4 className="font-bold text-xs text-purple-200">FastAPI & Qdrant AI</h4>
          <p className="text-[11px] text-slate-300 mt-1">
            Uploaded maintenance text persists in Qdrant. Retrieved sections ground provider
            responses and appear as source references.
          </p>
        </div>

        <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800">
          <Terminal className="w-5 h-5 text-amber-400 mb-1" />
          <h4 className="font-bold text-xs text-amber-200">Container configuration</h4>
          <p className="text-[11px] text-slate-300 mt-1">
            Docker Compose defines the frontend, Spring services, FastAPI, PostgreSQL, and Qdrant
            with persistence volumes.
          </p>
        </div>
      </div>

      {/* Interactive Microservice Map & Routing Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (4 cols): Services List */}
        <div className="lg:col-span-4 space-y-2">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">
            Core Microservices
          </h3>
          <div className="space-y-2">
            {services.map((svc) => (
              <div
                key={svc.id}
                onClick={() => setSelectedService(svc.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  selectedService === svc.id
                    ? 'bg-blue-50/80 border-blue-500 shadow-sm ring-1 ring-blue-500/20'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-gray-900">{svc.name}</span>
                  <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                    Port: {svc.port}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1 line-clamp-1">{svc.tech}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (8 cols): Service Details & Routing Inspector */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-5 border border-gray-200 shadow-xs space-y-5">
          <div className="flex items-start justify-between pb-3 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  PORT {activeServiceData.port}
                </span>
                <span className="text-xs text-gray-500 font-semibold">
                  {activeServiceData.tech}
                </span>
              </div>
              <h2 className="text-lg font-bold text-gray-900 mt-1">{activeServiceData.name}</h2>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                {activeServiceData.description}
              </p>
            </div>
          </div>

          {/* Active Gateway Injected Header Inspection */}
          <div className="bg-slate-950 text-white rounded-xl p-4 border border-slate-800 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold border-b border-slate-800 pb-2">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Lock className="w-3.5 h-3.5" />
                <span>Simulated Edge Request Headers (Forwarded Downstream)</span>
              </span>
              <span className="text-emerald-400">STATUS: 200 OK</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
              <div>
                <span className="text-slate-400">X-User-Id: </span>
                <span className="text-cyan-300">usr_9f82a1c0-44e2</span>
              </div>
              <div>
                <span className="text-slate-400">X-User-Role: </span>
                <span className="text-amber-300 font-bold">{userRole}</span>
              </div>
              <div>
                <span className="text-slate-400">X-Request-Id: </span>
                <span className="text-purple-300">req_7721df99-01</span>
              </div>
              <div>
                <span className="text-slate-400">X-Forwarded-Host: </span>
                <span className="text-slate-200">gateway:8080</span>
              </div>
            </div>
          </div>

          {/* Route Table */}
          <div>
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Registered API Endpoints & Route Predicates
            </h3>
            <div className="border border-gray-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Path Pattern</th>
                    <th className="py-2.5 px-3">Destination / Action</th>
                    <th className="py-2.5 px-3">Filter / Security</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono">
                  {activeServiceData.routes.map((r, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-3 font-bold text-blue-700">{r.path}</td>
                      <td className="py-2.5 px-3 text-gray-700 font-sans">{r.dest}</td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                          {r.auth}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
