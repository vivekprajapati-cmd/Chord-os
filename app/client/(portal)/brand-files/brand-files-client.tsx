'use client';

import { useState } from 'react';
import { FILE_SECTIONS, type FileSection } from './sections';

type ClientFile = {
  id: string;
  file_name: string;
  signedUrl: string | null;
  created_at: string;
  section: FileSection;
};

interface Props {
  brandName: string;
  colors: Record<string, string>;
  typography: Record<string, string>;
  voiceSummary: string | null;
  files: ClientFile[];
}

export default function BrandFilesClient({ brandName, colors, typography, voiceSummary, files }: Props) {
  const [activeSection, setActiveSection] = useState<FileSection>('Brand Identity');

  const sectionFiles = files.filter(f => f.section === activeSection);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontFamily: 'var(--f-display)', fontSize: '44px', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1 }}>
          Brand Files
        </h1>
        <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginTop: '6px' }}>
          {brandName}
        </p>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {FILE_SECTIONS.map(section => {
          const count = files.filter(f => f.section === section).length;
          const active = activeSection === section;
          return (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              style={{
                fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase',
                letterSpacing: '0.08em', padding: '8px 16px', borderRadius: '999px',
                border: '1px solid var(--ink)', cursor: 'pointer',
                background: active ? 'var(--ink)' : 'transparent',
                color: active ? 'var(--cream)' : 'var(--gray)',
                transition: 'background 0.15s, color 0.15s',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              {section}
              {count > 0 && (
                <span style={{
                  fontFamily: 'var(--f-mono)', fontSize: '9px',
                  background: active ? 'rgba(240,237,229,0.2)' : 'rgba(13,13,11,0.08)',
                  borderRadius: '999px', padding: '1px 6px',
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Section content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Brand Identity: show brand info cards + any files */}
        {activeSection === 'Brand Identity' && (
          <>
            {/* Colors */}
            <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '16px', padding: '24px 28px', boxShadow: '4px 4px 0 var(--ink)' }}>
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '16px' }}>Brand Colors</p>
              {Object.keys(colors).length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                  {Object.entries(colors).map(([name, hex]) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: hex, border: '1px solid var(--line)' }} />
                      <div>
                        <p style={{ fontFamily: 'var(--f-mono)', fontSize: '12px', fontWeight: 600 }}>{hex}</p>
                        <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', color: 'var(--gray)' }}>{name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: 'var(--gray)' }}>Not set yet.</p>
              )}
            </div>

            {/* Typography */}
            <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '16px', padding: '24px 28px', boxShadow: '4px 4px 0 var(--ink)' }}>
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '16px' }}>Typography</p>
              {Object.keys(typography).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {Object.entries(typography).map(([role, font]) => (
                    <div key={role} style={{ display: 'flex', gap: '16px', alignItems: 'baseline' }}>
                      <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', color: 'var(--gray)', width: '100px', flexShrink: 0 }}>{role}</p>
                      <p style={{ fontSize: '15px', fontWeight: 500 }}>{font}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: 'var(--gray)' }}>Not set yet.</p>
              )}
            </div>

            {/* Voice & Tone */}
            <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '16px', padding: '24px 28px', boxShadow: '4px 4px 0 var(--ink)' }}>
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '16px' }}>Voice & Tone</p>
              {voiceSummary ? (
                <p style={{ fontSize: '14px', lineHeight: 1.7 }}>{voiceSummary}</p>
              ) : (
                <p style={{ fontSize: '13px', color: 'var(--gray)' }}>Not set yet.</p>
              )}
            </div>

            {/* Brand Identity files below brand info */}
            {sectionFiles.length > 0 && (
              <div>
                <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '10px' }}>
                  Brand Identity Files
                </p>
                <FileList files={sectionFiles} />
              </div>
            )}
          </>
        )}

        {/* All other sections: just files */}
        {activeSection !== 'Brand Identity' && (
          sectionFiles.length === 0 ? (
            <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)' }}>
                No files in {activeSection} yet.
              </p>
            </div>
          ) : (
            <FileList files={sectionFiles} />
          )
        )}
      </div>
    </div>
  );
}

function FileList({ files }: { files: { id: string; file_name: string; signedUrl: string | null; created_at: string }[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {files.map(file => {
        const ext = file.file_name.split('.').pop()?.toUpperCase() ?? 'FILE';
        const date = new Date(file.created_at).toLocaleDateString('en-IN', {
          day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
        });
        return (
          <a
            key={file.id}
            href={file.signedUrl ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '12px',
              padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              textDecoration: 'none', color: 'inherit',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '8px', background: 'var(--ink)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: '8px', color: 'var(--cream)', letterSpacing: '0.04em' }}>{ext}</span>
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.file_name}
                </p>
                <p style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--gray)', marginTop: '2px' }}>{date}</p>
              </div>
            </div>
            <span style={{
              fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--cobalt)', flexShrink: 0, marginLeft: '16px',
            }}>
              Download →
            </span>
          </a>
        );
      })}
    </div>
  );
}
