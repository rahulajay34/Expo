import { Metadata } from 'next';
import { EditorWorkspace } from '@/components/features/editor/editor-workspace';

export const metadata: Metadata = {
  title: 'Editor | GCCP',
  description: 'Generate and edit course content with the 7-agent AI pipeline.',
};

export default function EditorPage() {
  return (
    <main className="min-h-screen bg-background">
      <EditorWorkspace />
    </main>
  );
}
