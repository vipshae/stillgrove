import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRightIcon } from 'lucide-react';
import { type Screen } from '../types';
import { useTrees } from '../hooks/useTrees';
import { useAuth } from '../hooks/useAuth';

interface NamingProps {
  onNavigate: (screen: Screen, data?: { treeName?: string; treeId?: string }) => void;
  key?: string;
}


// export function TreeCreation({ onTreeCreated }: NamingProps) {
//   const { createTree } = useTrees();
//   const [name, setName] = useState('');
//   const [loading, setLoading] = useState(false);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!name.trim()) return;
//     setLoading(true);
//     try {
//       await createTree(name.trim());
//       onTreeCreated();
//     } catch (err) {
//       console.error('Error creating tree:', err);
//     }
//     setLoading(false);
//   };

//   return (
//     <div className="tree-creation">
//       <h2>Create Your Anchor Tree</h2>
//       <p>Give your tree a name to begin your journey.</p>
//       <form onSubmit={handleSubmit}>
//         <input
//           type="text"
//           placeholder="Tree Name"
//           value={name}
//           onChange={(e) => setName(e.target.value)}
//           required
//         />
//         <button type="submit" disabled={loading}>
//           {loading ? 'Creating...' : 'Create Tree'}
//         </button>
//       </form>
//     </div>
//   );
// }





export default function Naming({ onNavigate }: NamingProps) {
  const { user } = useAuth();
  const { createTree } = useTrees(user);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex-grow flex flex-col items-center justify-center px-6 py-12 w-full max-w-3xl mx-auto"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
        className="mb-12 relative w-64 h-64 md:w-80 md:h-80 shrink-0"
      >
        <div className="absolute inset-0 bg-primary-container/10 rounded-full blur-[60px] opacity-40"></div>
        <div className="w-full h-full rounded-full overflow-hidden relative z-10 border border-on-surface/5 shadow-2xl">
          <img 
            className="w-full h-full object-cover" 
            src="https://picsum.photos/seed/sapling/600/600" 
            alt="Seedling"
            referrerPolicy="no-referrer"
          />
        </div>
      </motion.div>
      
      <div className="w-full max-w-lg flex flex-col items-center text-center space-y-12">
        <h1 className="font-headline text-5xl md:text-6xl text-primary font-medium italic">
          Name your Anchor Tree
        </h1>
        
        <div className="w-full relative group">
          <input 
            className="w-full bg-transparent text-center font-headline text-4xl text-on-surface placeholder:text-on-surface/20 placeholder:font-light border-0 border-b border-on-surface/10 focus:border-primary focus:ring-0 px-4 py-8 outline-none transition-all duration-500" 
            placeholder="Whisper a name..." 
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className={`absolute bottom-0 left-0 h-[2px] bg-primary transition-all duration-700 ease-out ${name ? 'w-full' : 'w-0'}`}></div>
        </div>
        
        <p className="font-body text-[11px] uppercase tracking-[0.25em] font-bold text-on-surface opacity-30 leading-relaxed max-w-sm mx-auto">
          Your Anchor Tree is the spiritual center of your grove. Choose a name that reflects the stillness you wish to cultivate.
        </p>
        
        <div className="pt-8 w-full flex justify-center">
          <button 
            disabled={!name || loading}
            onClick={async () => {
              setLoading(true);
              const trimmed = name.trim();
              // optimistic: navigate immediately so UI shows the new tree name
              onNavigate('sanctuary', { treeName: trimmed });
              try {
                const newTree = await createTree(trimmed);
                // set the selected tree id when creation completes
                if (newTree?.id) {
                  onNavigate('sanctuary', { treeName: trimmed, treeId: newTree.id });
                }
              } catch (err) {
                console.error('Error creating tree:', err);
                // revert: navigate back to naming if creation failed
                setName('');
                onNavigate('naming', { treeName: '' });
              } finally {
                setLoading(false);
              }
            }}
            className="group relative px-16 py-5 bg-primary text-white font-body text-sm uppercase tracking-[0.2em] font-bold rounded-full overflow-hidden transition-all duration-500 ease-in-out transform hover:-translate-y-1 hover:bg-primary-container disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-primary/10"
          >
            <span className="relative z-10 flex items-center gap-3">
              Plant Seed
              <ArrowRightIcon className="w-5 h-5 transition-transform duration-500 group-hover:translate-x-1" />
            </span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
