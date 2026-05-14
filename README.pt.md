# Graflow: Notação de Grafos e Fluxos

Graflow é uma linguagem de domínio específico (DSL) leve e intuitiva para descrever grafos, fluxos de trabalho e máquinas de estados. Ela utiliza uma sintaxe baseada em setas (`->`) para definir conexões entre nós, suportando sequências, transmissões (*broadcast*) e metadados.

## Sintaxe Básica

### Nós
Um nó é representado por um identificador alfanumérico.
```graflow
Home
```

### Conexões (Setas)
Use `->` para criar uma conexão unidirecional entre dois nós.
```graflow
Origem -> Destino
```

### Sequências
Você pode encadear múltiplos nós para definir um fluxo sequencial.
```graflow
Início -> Processamento -> Fim
```

## Recursos Avançados

### Metadados
Nós podem carregar informações adicionais entre parênteses. Isso é útil para estados de erro, parâmetros de configuração ou valores de sensores.
```graflow
Sensor_Temp(45C) -> Gateway -> Alerta(Crítico)
Pagamento -> Erro(CartaoRecusado) -> Repetir
```

### Grupos (Broadcast e Join)
Use colchetes `[]` para agrupar nós. Isso permite representar transmissões de um para muitos ou junções de muitos para um.

**Broadcast (Um para Muitos):**
```graflow
LoadBalancer -> [ ServidorA, ServidorB, ServidorC ]
```

**Join (Muitos para Um):**
```graflow
[ SensorA, SensorB ] -> ProcessadorCentral
```

**Complexo:**
```graflow
Entrada -> [ Filial_1, Filial_2 ] -> Saída
```

## Comentários e Documentação

Graflow suporta comentários para organizar e documentar seus fluxos:

- **JSDoc Style:** Útil para documentar blocos inteiros ou adicionar tags.
- **Linha Única:** Usando `//`.

```graflow
/**
 * Fluxo de Autenticação
 * @tag security
 */
Login -> [ Sucesso, Falha ]

// Log de auditoria
Sucesso -> Dashboard
```

## Implementação e Parser

O parser do Graflow (`graflow.ts`) processa o texto linha por linha e constrói um índice do grafo (`GraphIndex`).

- **ArrowGraphDB:** A classe principal que carrega o conteúdo e expõe métodos de consulta.
- **ExtractNodeData:** Extrai o ID do nó e o `meta` (conteúdo dos parênteses).
- **IndexSequence:** Converte a sequência de tokens em arestas (`edges`) no índice, lidando automaticamente com a expansão de grupos.

### Exemplo de Objeto JSON Gerado
Para a linha `A -> [ B, C ]`, o índice resultante seria:
```json
{
  "A": [
    { "to": "B", "meta": null, "context": "sequence" },
    { "to": "C", "meta": null, "context": "sequence" }
  ]
}
```

## Casos de Uso
- **Máquinas de Estado:** Visualizar transições de pedidos ou sessões.
- **Topologia de Rede:** Descrever conexões entre servidores e bancos de dados.
- **Fluxos de UI:** Mapear a navegação do usuário em um aplicativo.
- **Orquestração de Agentes:** No Chappie, Graflow é usado para persistir a topologia da árvore de agentes de uma instância.
