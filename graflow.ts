import * as fs from 'fs';
import * as path from 'path';

// --- Interfaces & Tipos ---

interface NodeData {
  id: string;
  meta: string | null;
}

interface GraphEdge {
  to: string;
  meta: string | null;
  context: 'sequence' | 'broadcast';
}

interface ParsedToken {
  type: 'single' | 'group';
  nodes?: NodeData[]; // Se for group
  node?: NodeData;    // Se for single
}

// O Índice do Grafo: Chave (ID do Nó) -> Lista de Arestas
type GraphIndex = Record<string, GraphEdge[]>;

// --- Classe Principal ---

export class ArrowGraphDB {
  private rawData: string = "";
  private graphIndex: GraphIndex = {};
  private eventsLog: any[] = []; 

  /**
   * Carrega o banco de dados a partir de uma string (DSL).
   */
  public load(textContent: string): void {
    this.rawData = textContent.trim();
    const lines = this.rawData.split('\n');

    let inDocBlock = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // --- Lógica para ignorar JSDoc ---
      if (trimmed.startsWith('/**') || trimmed.startsWith('/*')) {
        inDocBlock = true;
        // Se for comentário de uma linha só /** ... */
        if (trimmed.endsWith('*/')) {
           inDocBlock = false;
        }
        continue;
      }

      if (trimmed.endsWith('*/')) {
        inDocBlock = false;
        continue;
      }

      if (inDocBlock) continue;
      
      // Ignora linhas que começam com * (meio do JSDoc) ou // (comentário linha)
      if (trimmed.startsWith('*') || trimmed.startsWith('//')) continue;

      // --- Fim da Lógica de Ignorar ---
      
      this.parseLine(trimmed);
    }
  }

  public loadFile(filepath: string): void {
    try {
      const absolutePath = path.resolve(filepath);
      if (!fs.existsSync(absolutePath)) {
        console.error(`❌ Arquivo não encontrado: ${absolutePath}`);
        return;
      }
      const content = fs.readFileSync(absolutePath, 'utf-8');
      this.load(content);
      console.log(`✅ Carregado: ${filepath}`);
    } catch (err) {
      console.error(`Erro ao ler arquivo: ${err}`);
    }
  }

  private parseLine(line: string): void {
    // Separa por setas
    const tokens = line.split(/\s*->\s*/);
    const cleanSequence: ParsedToken[] = [];

    for (const tokenStr of tokens) {
      const token = tokenStr.trim();
      if (!token) continue;

      // Verifica se é Grupo: [ A, B ]
      if (token.startsWith('[') && token.endsWith(']')) {
        const innerContent = token.slice(1, -1);
        const innerNodesStr = innerContent.split(',').map(s => s.trim());
        const groupNodes: NodeData[] = innerNodesStr.map(s => this.extractNodeData(s));
        cleanSequence.push({ type: 'group', nodes: groupNodes });
      } else {
        // Nó Único
        const node = this.extractNodeData(token);
        cleanSequence.push({ type: 'single', node });
      }
    }

    if (cleanSequence.length > 0) {
      this.indexSequence(cleanSequence);
    }
  }

  private extractNodeData(nodeStr: string): NodeData {
    // Regex para capturar Nome e (Parenteses Opcionais)
    const match = nodeStr.match(/^([a-zA-Z0-9_\-]+)(?:\((.+)\))?$/);
    
    if (match) {
      return {
        id: match[1],
        meta: match[2] || null
      };
    }
    return { id: nodeStr, meta: null };
  }

  private indexSequence(sequence: ParsedToken[]): void {
    this.eventsLog.push(sequence);

    for (let i = 0; i < sequence.length - 1; i++) {
      const current = sequence[i];
      const nextStep = sequence[i + 1];

      const sources = current.type === 'group' ? current.nodes! : [current.node!];
      const targets = nextStep.type === 'group' ? nextStep.nodes! : [nextStep.node!];

      for (const src of sources) {
        if (!this.graphIndex[src.id]) {
          this.graphIndex[src.id] = [];
        }

        for (const tgt of targets) {
          this.graphIndex[src.id].push({
            to: tgt.id,
            meta: tgt.meta,
            context: 'sequence'
          });
        }
      }
    }
  }

  public searchPath(queryRegexStr: string): string[] {
    const results: string[] = [];
    const regex = new RegExp(queryRegexStr, 'i');
    const lines = this.rawData.split('\n');
    
    // Filtra para não retornar linhas de comentário na busca
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('/') || trimmed.startsWith('*')) continue;
      
      if (regex.test(line)) {
        results.push(line.trim());
      }
    }
    return results;
  }

  public getNeighbors(nodeId: string): GraphEdge[] {
    return this.graphIndex[nodeId] || [];
  }

  public toJSON(): string {
    return JSON.stringify(this.graphIndex, null, 2);
  }
}
