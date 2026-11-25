import './app'
import './font.css'
import './juki-theme.css'
import './calendar-agenda.css'
import './habit-planner.css'
import './theme-2027.css'
import './directions.css'

const previewDirection = new URLSearchParams(location.search).get('dir')
if (previewDirection) document.documentElement.dataset.dir = previewDirection
