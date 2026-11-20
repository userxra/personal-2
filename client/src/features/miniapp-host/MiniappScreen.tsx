import { Link, useParams } from 'react-router-dom';
import { Page } from '../../components/shell/PageHeader';
import { Loading } from '../../components/ui/misc';
import { useMiniappState } from './api';
import { MiniappFrame } from './Frame';
import { MiniappIcon } from './MiniappIcon';
import { miniappById } from './registry';
import { MiniappRuntime } from './Runtime';

/** One miniapp, full screen (with the site's navigation around it). */
export default function MiniappScreen() {
  const { appId = '' } = useParams();
  const def = miniappById(appId);
  const state = useMiniappState();

  if (!def)
    return (
      <MiniappFrame title="Not found">
        <p className="text-sm text-ink-muted">There is no miniapp called “{appId}”.</p>
      </MiniappFrame>
    );

  const icon = <MiniappIcon {...def.icon} app={def} size="sm" />;
  if (state.isLoading)
    return (
      <MiniappFrame title={def.name} icon={icon}>
        <Loading />
      </MiniappFrame>
    );
  if (!state.data?.apps[def.id]?.enabled)
    return (
      <MiniappFrame title={def.name} icon={icon}>
        <p className="text-sm text-ink-muted">
          {def.name} isn’t on your miniapps screen.{' '}
          <Link to="/miniapps/store" className="text-accent hover:underline">
            Get it in the Store
          </Link>
          .
        </p>
      </MiniappFrame>
    );

  const App = def.App;
  if (def.fullScreen)
    return (
      <Page width="narrow">
        <MiniappRuntime definition={def} place="app">
          <App />
        </MiniappRuntime>
      </Page>
    );
  return (
    <MiniappFrame title={def.name} icon={icon}>
      <MiniappRuntime definition={def} place="app">
        <App />
      </MiniappRuntime>
    </MiniappFrame>
  );
}
