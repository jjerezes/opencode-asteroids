---
description: Crea un worktree git en .worktrees/<nombre> sin cambiar de directorio.
---

El usuario invocó `/worktree` con el siguiente argumento: "$ARGUMENTS"

Analiza el contenido del argumento (puede tener espacios) y deriva un nombre corto y legible para el worktree:

- Convierte el texto en un identificador en kebab-case: sin espacios, sin mayúsculas, sin caracteres especiales (solo letras, números y guiones).
- Ejemplos: "añadir modo hardcore" -> agregar-modo-hardcore; "fix del input" -> fix-input.
- Si el argumento está vacío, usa "worktree" como nombre.
- Si los argumentos son muy largos, simplifícalo a un nombre significativo

Luego ejecuta UN solo comando, exactamente:

  git worktree add .worktrees/<nombre>

donde <nombre> es el nombre derivado.

NO hagas nada más:
- No cambies de directorio ni hagas cd.
- No ejecutes ningún otro comando git.
- No hagas checkout de la rama.
- No modifiques archivos.