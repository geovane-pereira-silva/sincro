# Gamificação e Programa de Indicação (Referral)

## O que é
Mecanismos de engajamento que recompensam o usuário por uso contínuo e por
indicar novos usuários, concedendo acesso premium temporário.

## Como funciona
1. Cada perfil tem um `referral_code` único.
2. Ao aplicar um código de indicação, o indicador ganha recompensas premium.
3. Recompensas por streak (7 dias consecutivos), perfil completo e indicações.

## Quem usa
Autônomo (principal); qualquer usuário com perfil.

## Regras de negócio
- `streak_7`: 7 dias consecutivos de registro → 7 dias de premium.
- `perfil_completo`: perfil 100% preenchido → 3 dias de premium.
- `referral`: 30 dias por indicação; `indicado_compartilhou`: +15 dias.
- Auto-indicação e código inexistente são ignorados silenciosamente.

## Tabelas do banco envolvidas
`profiles` (`referral_code`, `referred_by`, `referral_count`), `premium_access`.

## Rotas do sistema
`/ref/$code` (aplica indicação), telas de perfil/planos.

## Configurações
N/A (regras fixas nas funções do banco).

## Observações técnicas
Funções `generate_referral_code`, `aplicar_indicacao`,
`verificar_recompensas_premium`.
