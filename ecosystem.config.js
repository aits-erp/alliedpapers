module.exports = {
  apps: [
    {
      name: "allied_paper",
      cwd: "C:/Users/aitsadmin/Desktop/allied_paper",

      // Windows-safe execution
      script: "cmd.exe",
      args: "/c npx next start -p 3000",

      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    }
  ]
};
