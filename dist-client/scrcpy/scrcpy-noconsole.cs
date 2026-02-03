using System;
using System.Diagnostics;
using System.IO;
using System.Text;

class Program {
  static string Quote(string arg) {
    if (string.IsNullOrEmpty(arg)) return "\"\"";
    bool need = arg.IndexOfAny(new[] { ' ', '\t', '\n', '\r', '\"' }) >= 0;
    if (!need) return arg;
    var sb = new StringBuilder();
    sb.Append('\"');
    foreach (var c in arg) {
      if (c == '\"') sb.Append("\\\"");
      else sb.Append(c);
    }
    sb.Append('\"');
    return sb.ToString();
  }

  static void Main(string[] args) {
    string baseDir = AppDomain.CurrentDomain.BaseDirectory;
    string exePath = Path.Combine(baseDir, "scrcpy.exe");
    if (!File.Exists(exePath)) exePath = "scrcpy.exe";
    var psi = new ProcessStartInfo();
    psi.FileName = exePath;
    psi.WorkingDirectory = baseDir;
    if (args != null && args.Length > 0) {
      var sb = new StringBuilder();
      for (int i = 0; i < args.Length; i++) {
        if (i > 0) sb.Append(' ');
        sb.Append(Quote(args[i]));
      }
      psi.Arguments = sb.ToString();
    }
    psi.UseShellExecute = false;
    psi.CreateNoWindow = true;
    try { Process.Start(psi); } catch { }
  }
}
