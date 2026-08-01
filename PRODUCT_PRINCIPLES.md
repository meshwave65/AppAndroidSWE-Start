Ahh... agora entendi! 😄

Você está falando do **documento de filosofia do projeto**, aquele que acabamos construindo ao longo da conversa.

Eu acho que ele deve existir no repositório desde já.

Não como documentação técnica.

Mas como o documento que responde à pergunta:

> **"Como tomamos decisões neste projeto?"**

Eu o chamaria de:

```text
PRODUCT_PHILOSOPHY.md
```

ou, talvez ainda melhor,

```text
PRODUCT_PRINCIPLES.md
```

Eu escreveria algo assim:

---

# PRODUCT_PRINCIPLES.md

## Filosofia do Produto

O **Sofia Web Extractor (SWE)** não nasceu para demonstrar tecnologia.

Ele nasceu para resolver um problema real: impedir que conhecimento digital seja perdido e permitir sua recuperação de forma simples e rápida.

Toda decisão de desenvolvimento deve preservar esse objetivo.

---

## Nossa Promessa

O SWE existe para:

* Capturar conhecimento.
* Preservar conhecimento.
* Recuperar conhecimento quando ele for necessário.

Todo o restante é consequência.

---

## Princípios

### 1. O foco está no problema, não na tecnologia.

O usuário compra uma solução para recuperar seu conhecimento.

Ele não compra IA, embeddings, bancos vetoriais ou arquiteturas complexas.

---

### 2. Nenhuma funcionalidade entra apenas porque é interessante.

Toda nova funcionalidade deve responder positivamente à pergunta:

> **Sem ela o SWE deixa de cumprir sua promessa principal?**

Se a resposta for "não", ela pertence ao roadmap, não necessariamente à próxima versão.

---

### 3. Complexidade é um custo.

Cada nova funcionalidade aumenta:

* código;
* testes;
* documentação;
* suporte;
* manutenção.

Ela só deve existir quando o valor entregue justificar claramente esse aumento de complexidade.

---

### 4. O usuário deve perceber valor.

Toda versão precisa entregar melhorias que sejam percebidas pelo usuário.

Correções, manutenção e mudanças internas são importantes, mas não constituem, por si só, uma nova versão funcional.

---

### 5. Transparência gera confiança.

O conhecimento pertence ao usuário.

O SWE foi criado para guardar esse conhecimento, não para coletá-lo.

Sempre que houver compartilhamento de informações de uso, o usuário poderá visualizar exatamente quais dados serão enviados.

---

### 6. Simplicidade vence sofisticação.

Uma solução simples que resolve completamente o problema é preferível a uma solução sofisticada que aumenta a complexidade sem benefício proporcional.

---

### 7. A evolução é incremental.

O produto evolui continuamente.

Novas funcionalidades devem fortalecer a proposta principal do SWE, nunca desviar seu foco.

---

### 8. O sucesso é medido pelo uso.

O melhor indicador de sucesso não é o número de funcionalidades.

É o número de pessoas que passam a utilizar o SWE espontaneamente porque ele resolveu um problema real.

---

## Nossa pergunta permanente

Antes de iniciar qualquer desenvolvimento, devemos responder:

> **Se eu tivesse apenas cinco minutos para demonstrar o SWE a um cliente potencial, essa funcionalidade apareceria na demonstração?**

Se a resposta for "não", provavelmente ela não é prioridade.

---

## Visão

O SWE é o primeiro módulo do ecossistema SOFIA.

Ele entrega um ciclo completo de aquisição, preservação e recuperação do conhecimento.

Os módulos futuros (Curator, Vectorizer, Gestão do Conhecimento e outros) existem para potencializar esse ciclo, nunca para substituir sua função principal.

---

## Uma última sugestão

Eu colocaria esse documento **na raiz do repositório**, ao lado do `README.md`.

E faria uma coisa que considero muito importante: **não o trataria como documentação técnica, mas como a "Constituição" do projeto**.

Sempre que surgir uma nova ideia — seja minha, sua ou de qualquer colaborador — ela deve ser confrontada com esse documento.

Se a ideia contrariar esses princípios, não importa quão interessante ela pareça: ela não entra.

Acho que esse documento pode se tornar um dos ativos mais valiosos do SWE, porque ele protege justamente aquilo que você identificou como seu maior risco: perder o foco em meio a boas ideias. E, curiosamente, ele também preserva uma característica que considero muito forte na história do projeto: o SWE não nasceu de uma oportunidade de mercado, mas de uma necessidade real vivida por você. Essa origem merece ser preservada nas decisões futuras.
