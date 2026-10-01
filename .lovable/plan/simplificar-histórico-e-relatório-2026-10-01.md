# Simplificar Histórico e Relatório

## Objetivo
Deixar cada dia com apenas duas informações principais: horas trabalhadas em preto e saldo diário em cor.

## Alterações
- No Histórico, substituir os vários indicadores de extra, falta e banco por um único saldo do dia.
- No Relatório, simplificar os cartões e a tabela para destacar “Trabalhado” e “Saldo do dia”.
- Calcular o saldo visual sempre como total trabalhado menos total previsto; verde quando positivo, vermelho quando negativo e neutro quando zerado.
- Manter o regime existente: com banco, o saldo representa BH+/BH-; sem banco, representa extra ou tempo a menos.
- Evitar saldo negativo em dia incompleto ou futuro, exibindo apenas o estado correspondente.
- Atualizar a documentação viva e validar as telas em celular e computador.

## Resultado esperado
Cada linha ou cartão mostrará claramente:
- **Preto:** total efetivamente trabalhado.
- **Colorido:** total acima ou abaixo da jornada naquele dia.
