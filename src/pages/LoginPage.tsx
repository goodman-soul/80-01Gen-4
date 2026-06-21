import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cog, Wrench, LogIn, Zap } from 'lucide-react';
import { useAppStore, UserRole } from '@/store';

const roleOptions: { label: string; value: UserRole; path: string }[] = [
  { label: '租赁公司', value: 'rental', path: '/rental' },
  { label: '调度中心', value: 'dispatch', path: '/dispatch' },
  { label: '技师', value: 'tech', path: '/tech' },
  { label: '客户', value: 'client', path: '/client/confirm/demo' },
];

const presetUsers: Record<string, { role: UserRole; path: string; password: string }> = {
  admin: { role: 'dispatch', path: '/dispatch', password: '123456' },
  tech1: { role: 'tech', path: '/tech', password: '123456' },
  client: { role: 'client', path: '/client/confirm/demo', password: '123456' },
};

export default function LoginPage() {
  const navigate = useNavigate();
  const setRole = useAppStore((s) => s.setRole);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('rental');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (roleOverride?: UserRole, pathOverride?: string) => {
    setLoading(true);
    const role = roleOverride ?? selectedRole;
    const preset = presetUsers[username.toLowerCase()];
    let targetPath = pathOverride;

    if (!targetPath) {
      if (preset && (roleOverride || preset.role === role)) {
        targetPath = preset.path;
      } else {
        const option = roleOptions.find((o) => o.value === role);
        targetPath = option?.path ?? '/';
      }
    }

    const finalRole: UserRole = roleOverride ?? (preset ? preset.role : role);

    await new Promise((resolve) => setTimeout(resolve, 400));
    setRole(finalRole, username || null);
    setLoading(false);
    navigate(targetPath);
  };

  const handleQuickLogin = () => {
    setUsername('admin');
    setPassword('123456');
    handleLogin('dispatch', '/dispatch');
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    const preset = presetUsers[value.toLowerCase()];
    if (preset) {
      setSelectedRole(preset.role);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 gauge-grid-bg opacity-30" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(255,107,26,0.1) 0%, transparent 70%)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-brand-steel" />

      <div className="relative z-10 w-full max-w-md px-5 py-10">
        <div className="text-center mb-8">
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="absolute inset-0 rounded-3xl bg-brand-orange/20 blur-2xl scale-110" />
            <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-orange via-brand-orange-dark to-amber-700 flex items-center justify-center shadow-[0_0_40px_rgba(255,107,26,0.35)] border border-white/10">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/15 to-transparent" />
              <div className="relative flex items-center justify-center">
                <Cog className="w-9 h-9 text-white absolute -left-1 -top-1 animate-spin" style={{ animationDuration: '8s' }} strokeWidth={2} />
                <Wrench className="w-9 h-9 text-white relative left-2 top-2" strokeWidth={2} />
              </div>
            </div>
          </div>
          <h1 className="font-display text-4xl font-bold tracking-wider text-white mb-2">
            铁甲云维护
          </h1>
          <p className="text-sm text-brand-gray tracking-wide">
            工程机械智能保养派单系统 · 登录
          </p>
        </div>

        <div className="industrial-card p-7 shadow-industrial-lg">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-brand-orange via-brand-orange-hover to-amber-500" />

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-brand-gray mb-2 tracking-wider uppercase">
                用户名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="admin / tech1 / client"
                className="input-industrial"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-brand-gray mb-2 tracking-wider uppercase">
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="input-industrial"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-brand-gray mb-2 tracking-wider uppercase">
                角色选择
              </label>
              <select
                value={selectedRole ?? ''}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="input-industrial appearance-none cursor-pointer bg-brand-steel-lighter"
                disabled={loading}
              >
                {roleOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => handleLogin()}
              disabled={loading}
              className="btn-industrial-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogIn className="w-5 h-5" strokeWidth={2} />
              <span>{loading ? '登录中...' : '登 录'}</span>
            </button>

            <div className="divider-rivet">
              <span />
            </div>

            <button
              onClick={handleQuickLogin}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded font-medium text-sm transition-all duration-150 active:translate-y-[1px] border border-white/10 bg-gradient-to-r from-status-info/10 via-brand-orange/10 to-status-safe/10 text-white hover:from-status-info/20 hover:via-brand-orange/20 hover:to-status-safe/20 border-brand-orange/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap className="w-5 h-5 text-brand-orange" strokeWidth={2} fill="currentColor" />
              <span className="font-display tracking-wider">快速体验 · 管理员登录</span>
            </button>
          </div>
        </div>

        <div className="mt-8 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-xs text-brand-gray/70">
            <div className="w-1 h-1 rounded-full bg-brand-orange/50" />
            <span>测试账号预设密码均为 123456</span>
            <div className="w-1 h-1 rounded-full bg-brand-orange/50" />
          </div>
          <div className="flex items-center justify-center gap-3 text-xs text-brand-gray/50">
            <span className="px-2 py-1 rounded bg-white/5">admin</span>
            <span className="px-2 py-1 rounded bg-white/5">tech1</span>
            <span className="px-2 py-1 rounded bg-white/5">client</span>
          </div>
        </div>
      </div>
    </div>
  );
}
